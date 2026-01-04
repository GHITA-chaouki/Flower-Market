using backend.Data;
using backend.Models;
using backend.Prestataire.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace backend.Prestataire
{
    [ApiController]

    [Route("api/prestataire/products")]
    public class PrestataireProductsController : ControllerBase
    {
        private readonly FlowerMarketDbContext _context;

        public PrestataireProductsController(FlowerMarketDbContext context)
        {
            _context = context;
        }

        // =========================
        // UTIL : USER ID
        // =========================
        protected string? GetUserId()
        {
            // Get Firebase UID from request header
            return Request.Headers["X-Firebase-UID"].FirstOrDefault();
        }

        private async Task<Store?> GetMyStore()
        {
            var userId = Request.Headers["X-Firebase-UID"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId)) return null;

            Console.WriteLine("PRESTATAIRE USER ID = " + userId);

            var store = await _context.Stores
                .FirstOrDefaultAsync(s => s.PrestataireId == userId);

            // 🛠️ Auto-create store if valid Prestataire but no store exists
            if (store == null)
            {
                var user = await _context.Users.FindAsync(userId);
                if (user != null)
                {
                    Console.WriteLine("⚠️ User found but no Store. Creating store...");
                    store = new Store
                    {
                        PrestataireId = user.Id,
                        Name = user.FullName ?? user.Email ?? "Ma Boutique",
                        Description = "Boutique de " + (user.FullName ?? user.Email),
                        Address = "Non renseignée"
                    };
                    _context.Stores.Add(store);
                    await _context.SaveChangesAsync();
                    Console.WriteLine("✅ Store auto-created: " + store.Name);
                }
            }

            Console.WriteLine("STORE FOUND = " + (store != null));

            return store;
        }


        // =========================
        // HELPER: SAVE IMAGE
        // =========================
        private async Task<string?> SaveImage(IFormFile? image)
        {
            if (image == null || image.Length == 0) return null;

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "products");
            if (!Directory.Exists(uploadsFolder))
                Directory.CreateDirectory(uploadsFolder);

            var uniqueFileName = Guid.NewGuid().ToString() + "_" + image.FileName;
            var filePath = Path.Combine(uploadsFolder, uniqueFileName);

            using (var fileStream = new FileStream(filePath, FileMode.Create))
            {
                await image.CopyToAsync(fileStream);
            }

            // Retourne le chemin relatif pour l'URL (ex: /images/products/xyz.jpg)
            return "/images/products/" + uniqueFileName;
        }

        // =========================
        // CREATE PRODUCT (FORM + IMAGE)
        // =========================
        [HttpPost]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> CreateProduct(
            [FromForm] CreateProductFormDto dto
        )
        {
            var store = await GetMyStore();
            if (store == null)
                return BadRequest("Store introuvable");

            string? imageUrl = null;
            if (dto.Image != null)
            {
                imageUrl = await SaveImage(dto.Image);
            }

            var product = new Product
            {
                Name = dto.Name,
                Price = (double)dto.Price,
                Stock = dto.Stock,
                Category = dto.Category,
                Description = dto.Description,
                ImageUrl = imageUrl,
                StoreId = store.Id,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _context.Products.Add(product);
            
            // 🔔 Notification Product Created
            _context.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                Title = "Produit Ajouté",
                Message = $"Le produit '{product.Name}' a été ajouté avec succès à votre boutique.",
                Type = "Prestataire",
                IsRead = false,
                CreatedAt = DateTime.UtcNow,
                UserId = store.PrestataireId
            });

            await _context.SaveChangesAsync();

            return Ok(new { data = product });
        }

        // =========================
        // UPDATE PRODUCT
        // =========================
        [HttpPut("{id:int}")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UpdateProduct(int id, [FromForm] UpdateProductFormDto dto)
        {
            var store = await GetMyStore();
            if (store == null)
                return Unauthorized(new { success = false, message = "Accès non autorisé" });

            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.Id == id && p.StoreId == store.Id);

            if (product == null)
                return NotFound(new { success = false, message = "Produit introuvable ou accès refusé" });

            // Image handling
            if (dto.Image != null)
            {
                var newUrl = await SaveImage(dto.Image);
                if (newUrl != null)
                {
                    product.ImageUrl = newUrl;
                }
            }

            product.Name = dto.Name;
            product.Price = (double)dto.Price;
            product.Stock = dto.Stock;
            product.Category = dto.Category;
            product.Description = dto.Description;
            product.IsActive = dto.IsActive;

            try
            {
                await _context.SaveChangesAsync();
                return Ok(new { success = true, data = product });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = "Erreur lors de la mise à jour du produit", error = ex.Message });
            }
        }

        // =========================
        // DELETE PRODUCT
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var store = await GetMyStore();
            if (store == null) return BadRequest(new { error = "Store introuvable" });

            var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == id && p.StoreId == store.Id);
            if (product == null) return NotFound(new { error = "Produit introuvable" });

            // 🔍 Check if the product has orders
            var hasOrders = await _context.Orders.AnyAsync(o => o.ProductId == id);

            if (hasOrders)
            {
                // Soft delete: just deactivate
                product.IsActive = false;
                await _context.SaveChangesAsync();
                return Ok(new { message = "Le produit a été archivé car il possède des commandes passées." });
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Produit supprimé avec succès" });
        }


        // =========================
        // GET MY PRODUCTS
        // =========================
        [HttpGet]
        public async Task<IActionResult> GetMyProducts()
        {
            var store = await GetMyStore();
            if (store == null)
                return Ok(new { success = true, data = new List<object>() });

            try
            {
                var products = await _context.Products
                    .Where(p => p.StoreId == store.Id)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => new {
                        id = p.Id,
                        name = p.Name,
                        price = p.Price,
                        stock = p.Stock,
                        category = p.Category,
                        description = p.Description,
                        imageUrl = p.ImageUrl,
                        isActive = p.IsActive,
                        createdAt = p.CreatedAt,
                        promotions = p.Promotions.Select(pr => new {
                            id = pr.Id,
                            title = pr.Title,
                            discountPercent = pr.DiscountPercent
                        }).ToList()
                    })
                    .ToListAsync();

                return Ok(new { success = true, data = products });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR GetMyProducts: {ex}");
                return StatusCode(500, new { success = false, message = "Erreur lors de la récupération des produits", error = ex.Message });
            }
        }
    }
}
