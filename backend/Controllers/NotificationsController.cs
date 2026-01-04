using backend.Data;
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

        public NotificationsController(FlowerMarketDbContext context)
        {
            _context = context;
        }

        protected string? GetUserId()
        {
            var id = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("id")
                ?? User.FindFirstValue("sub")
                ?? Request.Headers["X-Firebase-UID"].FirstOrDefault();
                
            Console.WriteLine($"[NotificationsController] Detected UserId: {id}");
            return id;
        }

        // GET: api/notifications
        [HttpGet]
        public async Task<IActionResult> GetNotifications()
        {
            var userId = GetUserId();
            Console.WriteLine($"[Notifications] GetNotifications called for userId: {userId}");

            if (string.IsNullOrEmpty(userId)) 
            {
                 Console.WriteLine("[Notifications] Unauthorized: userId is null or empty");
                 return Unauthorized();
            }

            // Check if user is admin
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = userRole?.ToLower() == "admin";
            Console.WriteLine($"[Notifications] User role: {userRole}, IsAdmin: {isAdmin}");

            // Fetch notifications for this user OR admin notifications (only if user is admin)
            var query = _context.Notifications
                .Where(n => (n.UserId == userId || (isAdmin && n.Type == "Admin" && n.UserId == null)) && !n.IsRead);
                
            var count = await query.CountAsync();
            Console.WriteLine($"[Notifications] Query found {count} matches.");

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Select(n => new
                {
                    n.Id,
                    n.Title,
                    n.Message,
                    n.Type,
                    n.IsRead,
                    n.CreatedAt
                })
                .ToListAsync();

            Console.WriteLine($"[Notifications] Returning {items.Count} unread notifications for {userId}");
            foreach(var item in items) {
                Console.WriteLine($" - Notif: {item.Id}, IsRead: {item.IsRead}");
            }

            return Ok(new { data = items });
        }

        // GET: api/notifications/unread-count
        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var userId = GetUserId();
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            // Check if user is admin
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = userRole?.ToLower() == "admin";

            var count = await _context.Notifications.CountAsync(n => 
                (n.UserId == userId || (isAdmin && n.Type == "Admin" && n.UserId == null)) && !n.IsRead);
            return Ok(new { count });
        }

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkRead(string id)
        {
            Console.WriteLine($"[MarkRead] Received ID: '{id}'");
            
            var userId = GetUserId();
            Console.WriteLine($"[MarkRead] UserId: '{userId}'");
            
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            if (!Guid.TryParse(id, out Guid guidId))
            {
                Console.WriteLine($"[MarkRead] Failed to parse ID as GUID. Checking if debug ID...");
                // If it's the debug ID, just return OK
                if (id == "debug-1") return Ok(new { success = true });
                return BadRequest(new { error = "Invalid ID format" });
            }

            // Check if user is admin
            var userRole = User.FindFirstValue(ClaimTypes.Role);
            var isAdmin = userRole?.ToLower() == "admin";

            Console.WriteLine($"[MarkRead] Looking for notification with GUID: {guidId}");
            var n = await _context.Notifications.FirstOrDefaultAsync(x => 
                x.Id == guidId && 
                (x.UserId == userId || (isAdmin && x.Type == "Admin" && x.UserId == null))
            );

            if (n == null)
            {
                Console.WriteLine($"[MarkRead] Notification not found for GUID: {guidId} (UserId mismatch involved?)");
                return NotFound(new { error = "Notification not found" });
            }

            n.IsRead = true;
            await _context.SaveChangesAsync();
            Console.WriteLine($"[MarkRead] Successfully marked notification {guidId} as read");

            return Ok(new { success = true });
        }
    }
}
