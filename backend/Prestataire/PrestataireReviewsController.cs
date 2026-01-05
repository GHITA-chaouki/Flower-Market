using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Prestataire
{
    [ApiController]
    [Route("api/prestataire/reviews")]

    public class PrestataireReviewsController : ControllerBase
    {
        protected string? GetUserId()
        {
            return Request.Headers["X-Firebase-UID"].FirstOrDefault();
        }

        private readonly FlowerMarketDbContext _context;

        public PrestataireReviewsController(FlowerMarketDbContext context)
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
        public async Task<IActionResult> GetMyReviews()
        {
            var store = await GetMyStore();
            if (store == null) return Ok(new { data = new List<object>() });

            var reviews = await _context.Reviews
                .Where(r => r.Product.StoreId == store.Id)
                .Include(r => r.Product)
                .Include(r => r.User)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new
                {
                    id = r.Id,
                    rating = r.Rating,
                    comment = r.Comment,
                    productName = r.Product.Name,
                    userName = r.User.FullName,
                    date = r.CreatedAt
                })
                .ToListAsync();

            return Ok(new { data = reviews });
        }

    }
}
