using backend.Data;
using backend.DTOs;
using backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.Extensions.Hosting;

namespace backend.Controllers
{
    [ApiController]
    [Route("api/market")]
    public class MarketplaceController : ControllerBase
    {
        private readonly FlowerMarketDbContext _context;
        private readonly UserManager<AppUser> _userManager;
        private readonly IHostEnvironment _env;

        public MarketplaceController(FlowerMarketDbContext context, UserManager<AppUser> userManager, IHostEnvironment env)
        {
            _context = context;
            _userManager = userManager;
            _env = env;
        }

        // GET: api/market/products
        // Retourne tous les produits actifs, avec leur magasin
        [HttpGet("products")]
        public async Task<IActionResult> GetAllProducts()
        {
            var products = await _context.Products.AsNoTracking()
                .Where(p => p.IsActive)
                .Include(p => p.Store)
                .ThenInclude(s => s.Prestataire) // Include Prestataire
                .Include(p => p.Promotions.Where(pr => pr.EndDate > DateTime.UtcNow))
                .OrderByDescending(p => p.CreatedAt)
                .Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    price = p.Price,
                    category = p.Category,
                    imageUrl = p.ImageUrl,
                    description = p.Description,
                    stock = p.Stock,
                    storeName = p.Store != null ? p.Store.Name : "Boutique Inconnue",
                    prestataireName = p.Store != null && p.Store.Prestataire != null ? p.Store.Prestataire.FullName : "Inconnu", // Add Prestataire Name
                    // Calcul du prix réduit si promotion active
                    discount = p.Promotions.Any() ? p.Promotions.First().DiscountPercent : 0,
                    finalPrice = p.Promotions.Any()
                        ? p.Price * (1 - (p.Promotions.First().DiscountPercent / 100.0))
                        : p.Price
                })
                .ToListAsync();

            return Ok(new { data = products });
        }

        // GET: api/market/products/{id}
        [HttpGet("products/{id}")]
        public async Task<IActionResult> GetProductById(int id)
        {
            Console.WriteLine($"[Marketplace] Request Detail for ID: {id}");
            var p = await _context.Products.AsNoTracking()
                .Include(p => p.Store)
                .ThenInclude(s => s.Prestataire)
                .Include(p => p.Promotions.Where(pr => pr.EndDate > DateTime.UtcNow))
                .FirstOrDefaultAsync(p => p.Id == id);

            if (p == null) 
            {
                Console.WriteLine($"[Marketplace] Product {id} NOT FOUND in database.");
                return NotFound("Produit introuvable");
            }

            Console.WriteLine($"[Marketplace] Product {id} found: {p.Name}");

            var result = new
            {
                id = p.Id,
                name = p.Name,
                price = p.Price,
                category = p.Category,
                imageUrl = p.ImageUrl,
                description = p.Description,
                stock = p.Stock,
                storeName = p.Store?.Name ?? "Boutique Inconnue",
                prestataireName = p.Store?.Prestataire?.FullName ?? "Inconnu",
                discount = p.Promotions.Any() ? p.Promotions.First().DiscountPercent : 0,
                finalPrice = p.Promotions.Any()
                    ? p.Price * (1 - (p.Promotions.First().DiscountPercent / 100.0))
                    : p.Price
            };

            return Ok(result);
        }

        // GET: api/market/promoted
        // Retourne uniquement les produits en promotion (pour le slider)
        [HttpGet("promoted")]
        public async Task<IActionResult> GetPromotedProducts()
        {
            var promotedProducts = await _context.Products.AsNoTracking()
                .Where(p => p.IsActive && p.Promotions.Any(pr => pr.EndDate > DateTime.UtcNow))
                .Include(p => p.Store)
                .ThenInclude(s => s.Prestataire)
                .Include(p => p.Promotions)
                .Select(p => new
                {
                    id = p.Id,
                    name = p.Name,
                    originalPrice = p.Price,
                    imageUrl = p.ImageUrl,
                    category = p.Category,
                    prestataireName = p.Store != null && p.Store.Prestataire != null
                        ? (!string.IsNullOrEmpty(p.Store.Prestataire.FullName) ? p.Store.Prestataire.FullName : p.Store.Prestataire.UserName ?? p.Store.Prestataire.Email)
                        : "Inconnu",
                    prestataireEmail = p.Store != null && p.Store.Prestataire != null ? p.Store.Prestataire.Email : "",
                    prestatairePhone = p.Store != null && p.Store.Prestataire != null ? p.Store.Prestataire.PhoneNumber : "",
                    promotionTitle = p.Promotions.FirstOrDefault().Title,
                    discount = p.Promotions.FirstOrDefault().DiscountPercent,
                    finalPrice = p.Price * (1 - (p.Promotions.FirstOrDefault().DiscountPercent / 100.0)),
                    endDate = p.Promotions.FirstOrDefault().EndDate
                })
                .ToListAsync();

            return Ok(new { data = promotedProducts });
        }

        // POST: api/market/orders
        // Permet à un client connecté de passer commande
        [HttpPost("orders")]
        [Authorize] // Le client doit être connecté (Token JWT requis)
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto dto)
        {
            try
            {
                if (dto.Quantity <= 0)
                    return BadRequest("La quantité doit être supérieure à 0");

                // 🚨 ROBUST EMERGENCY FIX: Ensure all required columns exist in both Orders and Notifications
                try {
                    // Fix Notifications table
                    await _context.Database.ExecuteSqlRawAsync(
                        "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Notifications]') AND name = 'UserId') " +
                        "BEGIN ALTER TABLE [dbo].[Notifications] ADD [UserId] NVARCHAR(450) NULL; END"
                    );
                    
                    // Fix Orders table
                    await _context.Database.ExecuteSqlRawAsync(
                        "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'ShippingAddress') " +
                        "BEGIN ALTER TABLE [dbo].[Orders] ADD [ShippingAddress] NVARCHAR(MAX) NULL; END"
                    );
                    await _context.Database.ExecuteSqlRawAsync(
                        "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'CustomerPhone') " +
                        "BEGIN ALTER TABLE [dbo].[Orders] ADD [CustomerPhone] NVARCHAR(MAX) NULL; END"
                    );
                    await _context.Database.ExecuteSqlRawAsync(
                        "IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Orders]') AND name = 'PaymentMethod') " +
                        "BEGIN ALTER TABLE [dbo].[Orders] ADD [PaymentMethod] NVARCHAR(MAX) NULL; END"
                    );
                } catch (Exception ex) {
                    Console.WriteLine($"⚠️ Database Schema Auto-Fix Warning: {ex.Message}");
                }

                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                    return Unauthorized();

                // 1. Récupérer le produit
                var product = await _context.Products
                    .Include(p => p.Store)
                    .FirstOrDefaultAsync(p => p.Id == dto.ProductId);

                if (product == null)
                    return NotFound("Produit introuvable");

                if (!product.IsActive)
                    return BadRequest("Ce produit n'est plus disponible");

                if (product.Stock < dto.Quantity)
                    return BadRequest($"Stock insuffisant. Reste : {product.Stock}");

                // 2. Créer la commande
                var order = new Order
                {
                    ProductId = product.Id,
                    StoreId = product.StoreId, // Important pour que le Prestataire la voie
                    UserId = userId,
                    Quantity = dto.Quantity,
                    TotalPrice = product.Price * dto.Quantity, // On pourrait appliquer la promo ici aussi si voulu
                    ShippingAddress = dto.ShippingAddress,
                    CustomerPhone = dto.Phone,
                    PaymentMethod = dto.PaymentMethod,
                    CreatedAt = DateTime.UtcNow,
                    // Le client souhaite que la commande soit considérée validée immédiatement
                    Status = "validated"
                };

                // 3. Décrémenter le stock
                product.Stock -= dto.Quantity;

                _context.Orders.Add(order);

                // 🔔 NOTIFICATION PRESTATAIRE (NOUVELLE COMMANDE VALIDÉE)
                var notif = new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = "Nouvelle Commande",
                    Message = $"Commande reçue pour {product.Store?.Name ?? "Une boutique"}. Montant : {order.TotalPrice} MAD.",
                    Type = "Prestataire",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    UserId = product.Store?.PrestataireId
                };
                await _context.Notifications.AddAsync(notif);

                // 🔔 NOTIFICATION ADMIN (NOUVELLE TRANSACTION)
                Console.WriteLine($"[CreateOrder] Creating notification for Admin");
                var adminNotif = new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = "Nouvelle Transaction",
                    Message = $"Nouvelle commande de {dto.Quantity}x {product.Name}. Total: {order.TotalPrice} DHS.",
                    Type = "Admin",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    UserId = null // Admin notifications are global (null UserId)
                };
                await _context.Notifications.AddAsync(adminNotif);

                // 🔔 NOTIFICATION CLIENT (CONFIRMATION)
                Console.WriteLine($"[CreateOrder] Creating notification for Client: {userId}");
                var clientNotif = new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = "Votre commande est validée",
                    Message = $"Votre commande pour {product.Name} a été enregistrée et validée.",
                    Type = "Client",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    UserId = userId
                };
                await _context.Notifications.AddAsync(clientNotif);
                Console.WriteLine($"[CreateOrder] Client notification added to context. ID: {clientNotif.Id}");

                await _context.SaveChangesAsync();
                Console.WriteLine("[CreateOrder] SaveChanges completed - notifications should be in DB now");

                return Ok(new { message = "Commande créée avec succès", orderId = order.Id });
            }
            catch (Exception ex)
            {
                // log l'exception détaillée
                Console.WriteLine("======= ERROR IN CREATEORDER =======");
                Console.WriteLine($"Message: {ex.Message}");
                Console.WriteLine($"Source: {ex.Source}");
                Console.WriteLine($"Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                Console.WriteLine("====================================");

                if (_env != null && _env.IsDevelopment())
                {
                    return StatusCode(500, new { 
                        error = ex.Message, 
                        innerError = ex.InnerException?.Message,
                        stack = ex.StackTrace 
                    });
                }

                return StatusCode(500, new { error = "Internal server error", details = ex.Message });
            }
        }


        // POST: api/market/track-visit
        [HttpPost("track-visit")]
        public async Task<IActionResult> TrackVisit([FromQuery] string type = "Client")
        {
            try
            {
                var notif = new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = type == "Prestataire" ? "Visite prestataire" : "Visite client",
                    Message = "Un utilisateur a consulté la plateforme",
                    Type = "Admin",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };

                await _context.Notifications.AddAsync(notif);
                await _context.SaveChangesAsync();
                return Ok();
            }
            catch
            {
                return Ok();
            }
        }

        // ✅ MAINTENANT CETTE ROUTE EST BIEN DANS LA CLASSE
        [HttpGet("my-orders")]
        [Authorize]
        public async Task<IActionResult> GetMyOrders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId)) return Unauthorized();

            var orders = await _context.Orders
                .Where(o => o.UserId == userId)
                .Include(o => o.Product)
                .ThenInclude(p => p.Store)
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new
                {
                    o.Id,
                    ProductName = o.Product.Name,
                    ProductImage = o.Product.ImageUrl,
                    StoreName = o.Product.Store.Name,
                    o.Quantity,
                    o.TotalPrice,
                    o.Status,
                    o.CreatedAt,
                    ShippingAddress = o.ShippingAddress,
                    CustomerPhone = o.CustomerPhone,
                    PaymentMethod = o.PaymentMethod
                })
                .ToListAsync();

            return Ok(new { data = orders });
        }

        [HttpPost("orders/{id}/pay")]
        [Authorize]
        public async Task<IActionResult> PayOrder(int id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var order = await _context.Orders
                .FirstOrDefaultAsync(o => o.Id == id && o.UserId == userId);

            if (order == null)
                return NotFound("Commande introuvable.");

            if (order.Status != "confirmed" && order.Status != "pending")
                return BadRequest("Commande non payable.");

            order.Status = "processing";

            await _context.SaveChangesAsync();

            return Ok(new { message = "Paiement réussi", status = order.Status });
        }

        // PUT: api/market/orders/{id}/status
        // Permet au prestataire de changer le statut de la commande
        [HttpPut("orders/{id}/status")]
        [Authorize(Roles = "Prestataire,Admin")]
        public async Task<IActionResult> UpdateOrderStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var order = await _context.Orders
                .Include(o => o.Product)
                .Include(o => o.Store)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (order == null)
                return NotFound("Commande introuvable");

            // Vérification : si c'est un prestataire, il doit posséder la boutique
            if (User.IsInRole("Prestataire") && order.Store.PrestataireId != userId)
            {
                return Forbid();
            }

            var oldStatus = order.Status;
            order.Status = dto.Status.ToLower(); // validated, shipped, delivered, cancelled

            // 🔔 NOTIFICATION CLIENT (CHANGEMENT DE STATUT)
            if (oldStatus != order.Status)
            {
                var statusLabel = order.Status switch
                {
                    "validated" => "validée",
                    "shipped" => "expédiée et en cours de livraison",
                    "delivered" => "livrée",
                    "cancelled" => "annulée",
                    _ => order.Status
                };

                var clientNotif = new Notification
                {
                    Id = Guid.NewGuid(),
                    Title = "Mise à jour de votre commande",
                    Message = $"Votre commande #{order.Id} ({order.Product?.Name}) est désormais {statusLabel}.",
                    Type = "Client",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow,
                    UserId = order.UserId
                };
                await _context.Notifications.AddAsync(clientNotif);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Statut mis à jour", status = order.Status });
        }

    }
}
