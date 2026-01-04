using Microsoft.EntityFrameworkCore;
using backend.Data;
using backend.Models;
using backend.Prestataire.Dto;

namespace backend.Prestataire
{
    public class PrestataireService
    {
        private readonly FlowerMarketDbContext _db;

        public PrestataireService(FlowerMarketDbContext db)
        {
            _db = db;
        }

        // ---------------------------------------------------
        // 1. Récupérer la boutique du prestataire connecté
        // ---------------------------------------------------
        public async Task<Store> GetMyStore(string prestataireId)
        {
            return await _db.Stores
                .Include(s => s.Products)
                .FirstOrDefaultAsync(s => s.PrestataireId == prestataireId);
        }

        // ---------------------------------------------------
        // 2. Créer ou modifier la boutique
        // ---------------------------------------------------
        public async Task<Store> CreateOrUpdateStore(string prestataireId, CreateStoreDto dto)
        {
            var store = await _db.Stores.FirstOrDefaultAsync(s => s.PrestataireId == prestataireId);

            if (store == null)
            {
                // Création nouvelle boutique
                store = new Store
                {
                    PrestataireId = prestataireId,
                    Name = dto.Name,
                    Description = dto.Description,
                    Address = dto.Address
                };

                _db.Stores.Add(store);
            }
            else
            {
                // Mise à jour boutique
                store.Name = dto.Name;
                store.Description = dto.Description;
                store.Address = dto.Address;
            }

            await _db.SaveChangesAsync();
            return store;
        }

        // ---------------------------------------------------
        // 3. Ajouter un produit
        // ---------------------------------------------------
        public async Task<Product> AddProduct(string prestataireId, CreateProductDto dto)
        {
            try
            {
                Console.WriteLine($"=== DEBUG AddProduct ===");
                Console.WriteLine($"PrestataireId reçu: {prestataireId}");

                // 1. Chercher la boutique
                var store = await _db.Stores
                    .FirstOrDefaultAsync(s => s.PrestataireId == prestataireId);

                Console.WriteLine($"Boutique trouvée: {store != null}");

                if (store == null)
                {
                    Console.WriteLine($"AUCUNE BOUTIQUE pour prestataire: {prestataireId}");
                    Console.WriteLine($"Boutiques en DB: {await _db.Stores.CountAsync()}");

                    // Vérifier toutes les boutiques
                    var allStores = await _db.Stores.ToListAsync();
                    foreach (var s in allStores)
                    {
                        Console.WriteLine($"Store: ID={s.Id}, PrestataireId={s.PrestataireId}, Name={s.Name}");
                    }

                    return null;
                }

                Console.WriteLine($"Boutique ID: {store.Id}, Nom: {store.Name}");

                // 2. Créer le produit
                var product = new Product
                {
                    Name = dto.Name,
                    Price = dto.Price,
                    ImageUrl = dto.ImageUrl,
                    StoreId = store.Id
                };

                Console.WriteLine($"Création produit: Name={product.Name}, Price={product.Price}, StoreId={product.StoreId}");

                // 3. Sauvegarder
                _db.Products.Add(product);
                await _db.SaveChangesAsync();

                Console.WriteLine($"Produit créé avec ID: {product.Id}");
                Console.WriteLine($"=== FIN DEBUG ===");

                return product;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"EXCEPTION dans AddProduct: {ex.Message}");
                Console.WriteLine($"StackTrace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"InnerException: {ex.InnerException.Message}");
                }
                throw;
            }
        }

        // ---------------------------------------------------
        // 4. Modifier un produit
        // ---------------------------------------------------
        public async Task<bool> UpdateProduct(int id, UpdateProductDto dto)
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null) return false;

            product.Name = dto.Name;
            product.Price = dto.Price;
            product.ImageUrl = dto.ImageUrl;

            await _db.SaveChangesAsync();
            return true;
        }

        // ---------------------------------------------------
        // 5. Supprimer un produit
        // ---------------------------------------------------
        public async Task<bool> DeleteProduct(int id)
        {
            var product = await _db.Products.FindAsync(id);
            if (product == null) return false;

            _db.Products.Remove(product);
            await _db.SaveChangesAsync();
            return true;
        }

        // ---------------------------------------------------
        // 6. Récupérer les commandes du prestataire
        // ---------------------------------------------------
        public async Task<List<Order>> GetOrders(string prestataireId)
        {
            var store = await GetMyStore(prestataireId);
            if (store == null) return new List<Order>();

            return await _db.Orders
                .Where(o => o.StoreId == store.Id)
                .Include(o => o.Product)
                .ToListAsync();
        }
        public async Task<List<Product>> GetProducts(string prestataireId)
        {
            var store = await GetMyStore(prestataireId);
            if (store == null) return new List<Product>();

            return await _db.Products
                .Where(p => p.StoreId == store.Id)
                .ToListAsync();
        }

        public async Task<List<Review>> GetReviews(string prestataireId)
        {
            var store = await GetMyStore(prestataireId);
            if (store == null) return new List<Review>();

            return await _db.Reviews
                .Where(r => r.Product.StoreId == store.Id)
                .Include(r => r.Product)
                .Include(r => r.User)
                .ToListAsync();
        }

        public async Task AddPromotion(string prestataireId, CreatePromotionDto dto)
        {
            var store = await GetMyStore(prestataireId);
            if (store == null) return;

            var promotion = new Promotion
            {
                ProductId = dto.ProductId,
                Title = dto.Title,
                Description = dto.Description,
                DiscountPercent = dto.DiscountPercent,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate
            };

            _db.Promotions.Add(promotion);
            await _db.SaveChangesAsync();
        }


    }
}