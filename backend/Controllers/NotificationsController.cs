using backend.Data;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly FlowerMarketDbContext _context;
        private readonly IExpoPushNotificationService _pushService;

        public NotificationsController(FlowerMarketDbContext context, IExpoPushNotificationService pushService)
        {
            _context = context;
            _pushService = pushService;
            Console.WriteLine("✅ [NotificationsController] Constructor - Instantiated");
        }

        [HttpGet("ping")]
        [AllowAnonymous]
        public IActionResult Ping()
        {
            Console.WriteLine("✅ [NotificationsController] Ping request received.");
            return Ok(new { message = "pong", time = DateTime.UtcNow });
        }

        protected string? GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("id")
                ?? User.FindFirstValue("sub")
                ?? Request.Headers["X-Firebase-UID"].FirstOrDefault();

            Console.WriteLine($"🔍 [GetUserId] Resolved ID: {id ?? "NULL"}");
            return id;
        }

        // GET: api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            try
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var userRole = User.FindFirstValue(ClaimTypes.Role);
                var isAdmin = userRole?.ToLower() == "admin";

                var query = _context.Notifications
                    .Where(n => (n.UserId == userId || (isAdmin && n.Type == "Admin" && n.UserId == null)) && !n.IsRead);
                    
                var items = await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Select(n => new { n.Id, n.Title, n.Message, n.Type, n.IsRead, n.CreatedAt })
                    .ToListAsync();

                return Ok(new { data = items });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ [GetNotifications] Error: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            try 
            {
                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId)) return Unauthorized();

                var userRole = User.FindFirstValue(ClaimTypes.Role);
                var isAdmin = userRole?.ToLower() == "admin";

                var count = await _context.Notifications.CountAsync(n => 
                    (n.UserId == userId || (isAdmin && n.Type == "Admin" && n.UserId == null)) && !n.IsRead);
                return Ok(new { count });
            }
            catch (Exception ex)
            {
                 Console.WriteLine($"❌ [GetUnreadCount] Error: {ex}");
                 return Ok(new { count = 0 });
            }
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(string id)
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (!Guid.TryParse(id, out Guid guidId)) return BadRequest("Invalid ID");

            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = userRole?.ToLower() == "admin";

            var n = await _context.Notifications.FirstOrDefaultAsync(x => 
                x.Id == guidId && 
                (x.UserId == userId || (isAdmin && x.Type == "Admin" && x.UserId == null))
            );

            if (n == null) return NotFound();

            n.IsRead = true;
            await _context.SaveChangesAsync();
            return Ok(new { success = true });
        }

        [HttpPost("register-token")]
        public async Task<IActionResult> RegisterToken([FromBody] TokenRegistrationRequest request)
        {
            Console.WriteLine("📥 [RegisterToken] Request received.");
            
            try
            {
                if (request == null || string.IsNullOrEmpty(request.Token))
                {
                    Console.WriteLine("❌ [RegisterToken] Invalid token.");
                    return BadRequest("Invalid token");
                }
                
                Console.WriteLine($"📥 [RegisterToken] Token: {request.Token.Substring(0, Math.Min(10, request.Token.Length))}...");

                var userId = GetUserId();
                if (string.IsNullOrEmpty(userId)) return Unauthorized("User not authenticated");

                var user = await _context.Users.FindAsync(userId);
                if (user == null) return NotFound($"User {userId} not found");

                // Update token
                user.ExpoPushToken = request.Token;
                
                // SAVE
                Console.WriteLine($"💾 [RegisterToken] Saving token for {user.Email}");
                await _context.SaveChangesAsync();
                
                // TEST PUSH IMMEDIATELY (Verification Step)
                _ = Task.Run(async () => {
                    await Task.Delay(2000); // Wait 2s
                    Console.WriteLine("🚀 [AutoTest] Sending welcome push...");
                    await _pushService.SendPushNotificationAsync(
                        user.ExpoPushToken,
                        "Notifications Active ✅",
                        "Vous recevrez désormais les alertes en temps réel."
                    );
                });

                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"🔥 [RegisterToken] ERROR: {ex}");
                return StatusCode(500, new { error = ex.Message });
            }
        }
        
        [HttpPost("test-push")]
        public async Task<IActionResult> DebugPush()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();
            
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();
            
            if (string.IsNullOrEmpty(user.ExpoPushToken)) 
                return BadRequest("No token registered for this user.");
                
            Console.WriteLine($"🚀 [DebugPush] Manually triggering push for {user.Email}");
            var sent = await _pushService.SendPushNotificationAsync(
                user.ExpoPushToken,
                "Test de Notification 🔔",
                "Ceci est un test pour vérifier l'affichage."
            );
            
            return Ok(new { sent });
        }
    }

    public class TokenRegistrationRequest
    {
        public string Token { get; set; } = string.Empty;
    }
}
