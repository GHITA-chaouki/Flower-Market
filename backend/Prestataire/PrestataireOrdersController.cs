using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Prestataire
{
    [ApiController]
    [Route("api/prestataire/orders")]

    public class PrestataireOrdersController : ControllerBase
    {
        private readonly FlowerMarketDbContext _context;

        public PrestataireOrdersController(FlowerMarketDbContext context)
        {
            _context = context;
        }

        private async Task<Store?> GetMyStore()
        {
            var userId = Request.Headers["X-Firebase-UID"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId)) return null;

            var store = await _context.Stores
                .FirstOrDefaultAsync(s => s.PrestataireId == userId);

            if (store == null)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    store = new Store
                    {
                        PrestataireId = user.Id,
                        Name = user.FullName ?? user.Email ?? "Ma Boutique",
                        Description = "Boutique de " + (user.FullName ?? user.Email),
                        Address = "Non renseignée"
                    };
                    _context.Stores.Add(store);
                    await _context.SaveChangesAsync();
                }
            }
            return store;
        }

        [HttpGet]
        public async Task<IActionResult> GetMyOrders()
        {
            try
            {
                var store = await GetMyStore();
                if (store == null) return Ok(new { success = true, data = new List<object>() });

                var orders = await _context.Orders
                    .Where(o => o.StoreId == store.Id)
                    .OrderByDescending(o => o.CreatedAt)
                    .Select(o => new
                    {
                        id = o.Id,
                        createdAt = o.CreatedAt,
                        status = o.Status,
                        totalAmount = o.TotalPrice,
                        customerName = o.User != null ? o.User.FullName : "Client Inconnu",
                        customerEmail = o.User != null ? o.User.Email : "",
                        customerAddress = o.ShippingAddress,
                        productName = o.Product != null ? o.Product.Name : "Produit Inconnu",
                        quantity = o.Quantity
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = orders });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR GetMyOrders: {ex}");
                return StatusCode(500, new { success = false, message = "Erreur lors de la récupération des commandes", error = ex.Message });
            }
        }

        public class UpdateOrderStatusRequest
        {
            [System.Text.Json.Serialization.JsonPropertyName("status")]
            public string Status { get; set; }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateOrderStatusRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.Status)) return BadRequest(new { error = "status is required" });

            try
            {
                var store = await GetMyStore();
                if (store == null) return BadRequest(new { error = "Store not found." });

                var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == id && o.StoreId == store.Id);

                if (order == null) return NotFound(new { error = "Order not found." });

                order.Status = request.Status;

                // Notifier le client du changement
                try
                {
                    var notif = new backend.Models.Notification
                    {
                        Id = Guid.NewGuid(),
                        Title = "Mise à jour de votre commande",
                        Message = $"La commande #{order.Id} est maintenant : {order.Status}.",
                        Type = "Client",
                        IsRead = false,
                        CreatedAt = DateTime.UtcNow,
                        UserId = order.UserId
                    };
                    await _context.Notifications.AddAsync(notif);
                }
                catch
                {
                    // ignore notification failures
                }

                await _context.SaveChangesAsync();

                return Ok(new { 
                    success = true, 
                    data = new { 
                        id = order.Id, 
                        status = order.Status 
                    } 
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR UpdateOrderStatus: {ex}");
                return StatusCode(500, new { success = false, message = "Erreur lors de la mise à jour du statut", error = ex.Message });
            }
        }
    }

}
