using backend.Data;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Prestataire
{
    [ApiController]
    [Route("api/prestataire/promotions")]

    public class PrestatairePromotionsController : ControllerBase
    {
        protected string? GetUserId()
        {
            return Request.Headers["X-Firebase-UID"].FirstOrDefault();
        }

        private readonly FlowerMarketDbContext _context;

        public PrestatairePromotionsController(FlowerMarketDbContext context)
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
                // Auto-create store if valid Prestataire but no store exists
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
        public async Task<IActionResult> GetMyPromotions()
        {
            var store = await GetMyStore();
            if (store == null) return Ok(new { data = new List<object>() });

            var promotions = await _context.Promotions
                .Where(p => p.Product.StoreId == store.Id)
                .Include(p => p.Product)
                .OrderByDescending(p => p.EndDate)
                .Select(p => new
                {
                    id = p.Id,
                    title = p.Title,
                    code = p.Code,
                    discount = p.DiscountPercent,
                    startDate = p.StartDate,
                    endDate = p.EndDate,
                    usageCount = p.UsageCount,
                    usageLimit = p.UsageLimit,
                    productId = p.ProductId,
                    productName = p.Product.Name
                })
                .ToListAsync();

            return Ok(new { data = promotions });
        }

        [HttpPost]
        public async Task<IActionResult> CreatePromotion([FromBody] Promotion dto)
        {
            var store = await GetMyStore();
            if (store == null) return BadRequest(new { error = "Store not found." });

            // vérifier que le produit appartient au store
            var productOk = await _context.Products.AnyAsync(pr => pr.Id == dto.ProductId && pr.StoreId == store.Id);
            if (!productOk) return BadRequest(new { error = "Product does not belong to you." });

            var promo = new Promotion
            {
                Title = dto.Title ?? "Promotion",
                Description = dto.Description ?? "",
                DiscountPercent = dto.DiscountPercent,
                StartDate = dto.StartDate == default ? DateTime.UtcNow : dto.StartDate,
                EndDate = dto.EndDate == default ? DateTime.UtcNow.AddDays(7) : dto.EndDate,
                ProductId = dto.ProductId,
                Code = string.IsNullOrWhiteSpace(dto.Code) ? Guid.NewGuid().ToString("N")[..8].ToUpper() : dto.Code,
                UsageLimit = dto.UsageLimit
            };

            _context.Promotions.Add(promo);
            
            // 🔔 Notification Promotion Created
            _context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                Title = "Promotion Lancée",
                Message = $"Une nouvelle promotion '{promo.Title}' a été créée pour votre produit.",
                Type = "Prestataire",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                UserId = store.PrestataireId
            });

            await _context.SaveChangesAsync();

            return Ok(new { data = promo });
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdatePromotion(int id, [FromBody] Promotion dto)
        {
            var store = await GetMyStore();
            if (store == null) return BadRequest(new { error = "Store not found." });

            var promo = await _context.Promotions
                .Include(p => p.Product)
                .FirstOrDefaultAsync(p => p.Id == id && p.Product.StoreId == store.Id);

            if (promo == null) return NotFound(new { error = "Promotion not found." });

            // Update allowed fields
            promo.DiscountPercent = dto.DiscountPercent;
            if (dto.StartDate != default) promo.StartDate = dto.StartDate;
            if (dto.EndDate != default) promo.EndDate = dto.EndDate;
            
            await _context.SaveChangesAsync();

            return Ok(new { data = promo });
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeletePromotion(int id)
        {
            var store = await GetMyStore();
            if (store == null) return BadRequest(new { error = "Store not found." });

            var promo = await _context.Promotions
                .Include(p => p.Product)
                .FirstOrDefaultAsync(p => p.Id == id && p.Product.StoreId == store.Id);

            if (promo == null) return NotFound(new { error = "Promotion not found." });

            _context.Promotions.Remove(promo);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Deleted" });
        }
    }
}
