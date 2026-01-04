using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Prestataire
{
    [ApiController]
    [Route("api/prestataire")]

    public class PrestataireStatsController : ControllerBase
    {
        protected string? GetUserId()
        {
            return Request.Headers["X-Firebase-UID"].FirstOrDefault();
        }

        private readonly FlowerMarketDbContext _context;

        public PrestataireStatsController(FlowerMarketDbContext context)
        {
            _context = context;
        }

        private async Task<Store?> GetMyStore()
        {
            var userId = Request.Headers["X-Firebase-UID"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId)) return null;

            var store = await _context.Stores.FirstOrDefaultAsync(s => s.PrestataireId == userId);

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

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            var store = await GetMyStore();
            if (store == null) return Ok(new { success = true, data = new { products = 0, orders = 0, revenue = 0 } });

            var storeId = store.Id;

            var totalProducts = await _context.Products.CountAsync(p => p.StoreId == storeId);

            var ordersQuery = _context.Orders.Where(o => o.StoreId == storeId);
            var totalOrders = await ordersQuery.CountAsync();
            var pendingOrders = await ordersQuery.CountAsync(o => o.Status == "pending");
            var totalRevenue = await ordersQuery.SumAsync(o => (double?)o.TotalPrice) ?? 0;

            var reviewsQuery = _context.Reviews.Where(r => r.Product.StoreId == storeId);
            var totalReviews = await reviewsQuery.CountAsync();
            var avgRating = totalReviews == 0 ? 0.0 : await reviewsQuery.AverageAsync(r => (double)r.Rating);

            return Ok(new
            {
                data = new
                {
                    totalProducts,
                    totalOrders,
                    pendingOrders,
                    totalReviews,
                    averageRating = avgRating,
                    totalRevenue
                }
            });
        }
    }
}
