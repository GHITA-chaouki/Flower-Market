using backend.Models;
using backend.Admin.Dto;
using backend.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace backend.Admin
{
    public class AdminService
    {
        private readonly UserManager<AppUser> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        private readonly FlowerMarketDbContext _context;

        public AdminService(
            UserManager<AppUser> userManager,
            RoleManager<IdentityRole> roleManager,
            FlowerMarketDbContext context)
        {
            _userManager = userManager;
            _roleManager = roleManager;
            _context = context;
        }

        // =======================
        // STATISTIQUES ADMIN
        // =======================
        public async Task<AdminStatsDto> GetStatistics()
        {
            var users = await _userManager.Users.ToListAsync();

            int totalClients = 0;
            int totalPrestataires = 0;
            int pendingPrestataires = 0;

            foreach (var user in users)
            {
                if (await _userManager.IsInRoleAsync(user, "Client"))
                    totalClients++;

                if (await _userManager.IsInRoleAsync(user, "Prestataire"))
                {
                    totalPrestataires++;
                    if (!user.IsApproved)
                        pendingPrestataires++;
                }
            }

            return new AdminStatsDto
            {
                TotalClients = totalClients,
                TotalPrestataires = totalPrestataires,
                PendingPrestataires = pendingPrestataires,
                TotalProducts = await _context.Products.CountAsync(),
                TotalOrders = await _context.Orders.CountAsync(),
                TotalRevenue = await _context.Orders.SumAsync(o => (decimal?)o.TotalPrice) ?? 0,
                PendingOrders = await _context.Orders.CountAsync()
            };
        }

        // =======================
        // UTILISATEURS
        // =======================
        public async Task<List<UserDto>> GetAllUsers()
        {
            var users = await _userManager.Users.ToListAsync();
            var result = new List<UserDto>();

            foreach (var user in users)
            {
                var roles = await _userManager.GetRolesAsync(user);

                result.Add(new UserDto
                {
                    Id = user.Id,
                    FullName = user.FullName,
                    Email = user.Email,
                    Role = roles.FirstOrDefault() ?? "Client",
                    IsApproved = user.IsApproved,
                    CreatedAt = user.CreatedAt
                    // ✅ SAFE
                });
            }

            return result;
        }

        // =======================
        // PRESTATAIRES
        // =======================
        public async Task<List<UserDto>> GetPrestataires()
        {
            var prestataires = await _userManager.GetUsersInRoleAsync("Prestataire");

            return prestataires.Select(p => new UserDto
            {
                Id = p.Id,
                FullName = p.FullName,
                Email = p.Email,
                PhoneNumber = p.PhoneNumber ?? "Non renseigné", // Map Phone Number
                Role = "Prestataire",
                IsApproved = p.IsApproved,
                CreatedAt = DateTime.Now // ✅ SAFE
            }).ToList();
        }

        // =======================
        // PRODUITS
        // =======================
        public async Task<List<AdminProductDto>> GetAllProducts(string? prestataireId = null)
        {
            try
            {
                Console.WriteLine($"[AdminService] Récupération des produits. PrestataireId: {prestataireId ?? "Tous"}");

                var query = _context.Products
                    .Include(p => p.Store)
                        .ThenInclude(s => s.Prestataire)
                    .Include(p => p.Orders)
                    .Include(p => p.Reviews)
                    .Include(p => p.Promotions) // INCLUDE PROMOTIONS
                    .AsQueryable();

                // Filtrer par prestataire si l'ID est fourni
                if (!string.IsNullOrEmpty(prestataireId))
                {
                    Console.WriteLine($"[AdminService] Filtrage par prestataire: {prestataireId}");
                    query = query.Where(p => p.Store != null && p.Store.PrestataireId == prestataireId);
                }

                var products = await query
                    .OrderByDescending(p => p.CreatedAt)
                    .ToListAsync();

                Console.WriteLine($"[AdminService] Nombre de produits trouvés: {products.Count}");

                var result = products.Select(p => new AdminProductDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Price = (decimal)p.Price,
                    ImageUrl = p.ImageUrl,
                    Description = p.Description ?? "",
                    Category = p.Category ?? "Non catégorisé",
                    Stock = p.Stock,
                    IsActive = p.IsActive,
                    CreatedAt = p.CreatedAt,
                    StoreId = p.StoreId,
                    StoreName = p.Store?.Name ?? "Boutique inconnue",
                    PrestataireId = p.Store?.PrestataireId,
                    PrestataireName = p.Store?.Prestataire != null
                        ? (!string.IsNullOrEmpty(p.Store.Prestataire.FullName) ? p.Store.Prestataire.FullName : p.Store.Prestataire.UserName ?? p.Store.Prestataire.Email)
                        : "Inconnu",
                    PrestataireEmail = p.Store?.Prestataire?.Email ?? "",
                    TotalOrders = p.Orders?.Count ?? 0,
                    AverageRating = p.Reviews?.Any() == true ? p.Reviews.Average(r => r.Rating) : 0,
                    // Map Promotions
                    Promotions = p.Promotions.Select(pr => new PromotionDto
                    {
                        Title = pr.Title,
                        DiscountPercent = pr.DiscountPercent,
                        EndDate = pr.EndDate
                    }).ToList()
                }).ToList();

                return result;
            }
            catch (Exception ex)
            {
                // Log the error
                Console.WriteLine($"[AdminService] Erreur lors de la récupération des produits: {ex.Message}");
                Console.WriteLine(ex.StackTrace);

                // Retourner une liste vide en cas d'erreur
                return new List<AdminProductDto>();
            }
        }

        // =======================
        // COMMANDES
        // =======================
        public async Task<List<OrderDto>> GetAllOrders()
        {
            var orders = await _context.Orders
                .Include(o => o.Product)
                    .ThenInclude(p => p.Store)
                    .ThenInclude(s => s.Prestataire)
                .Include(o => o.User)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();

            return orders.Select(o => new OrderDto
            {
                Id = o.Id,
                ProductName = o.Product != null ? o.Product.Name : "Produit supprimé",
                Quantity = o.Quantity,
                TotalPrice = (decimal)o.TotalPrice,
                Status = o.Status ?? "En attente",
                CustomerName = o.User != null ? o.User.FullName : "Client inconnu",
                CustomerEmail = o.User != null ? o.User.Email : "Email inconnu",
                OrderDate = o.CreatedAt,
                PrestataireName = o.Product?.Store?.Prestataire?.FullName ??
                                 (o.Product?.Store?.Prestataire?.UserName ??
                                 (o.Product?.Store?.Prestataire?.Email ?? "Inconnu"))
            }).ToList();
        }

        // =======================
        // SUPPRIMER UTILISATEUR
        // =======================
        public async Task<bool> DeleteUser(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            var result = await _userManager.DeleteAsync(user);
            return result.Succeeded;
        }

        // =======================
        // APPROUVER PRESTATAIRE
        // =======================
        public async Task<bool> ApprovePrestataire(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return false;

            user.IsApproved = true;
            await _userManager.UpdateAsync(user);

            // ✅ CRÉATION AUTOMATIQUE DU STORE
            var storeExists = await _context.Stores
                .AnyAsync(s => s.PrestataireId == userId);

            if (!storeExists)
            {
                var store = new Store
                {
                    Name = $"Boutique de {user.FullName}",
                    Description = "Description de la boutique",
                    Address = "Adresse à définir",
                    PrestataireId = userId
                };

                _context.Stores.Add(store);
                await _context.SaveChangesAsync();
            }

            return true;
        }

        // =======================
        // REJETER PRESTATAIRE
        // =======================
        public async Task<bool> RejectPrestataire(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return false;

            var result = await _userManager.DeleteAsync(user);
            return result.Succeeded;
        }
        public async Task<List<Notification>> GetLastNotifications()
        {
            return await _context.Notifications
                .OrderByDescending(n => n.CreatedAt)
                .Take(10)
                .ToListAsync();
        }

        public async Task<bool> MarkNotificationAsRead(Guid id)
        {
            var notification = await _context.Notifications.FindAsync(id);
            if (notification == null) return false;

            notification.IsRead = true;
            await _context.SaveChangesAsync();
            return true;
        }

    }

}
