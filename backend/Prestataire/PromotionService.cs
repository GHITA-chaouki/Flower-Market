using backend.Data;
using backend.Models;
using backend.Prestataire.Dto;
using Microsoft.EntityFrameworkCore;

namespace backend.Prestataire
{
    public class PromotionService
    {
        private readonly FlowerMarketDbContext _db;

        public PromotionService(FlowerMarketDbContext db)
        {
            _db = db;
        }

        // -----------------------------------------------------
        // Récupérer toutes les promotions du prestataire
        // -----------------------------------------------------
        public async Task<List<Promotion>> GetMyPromotions(string prestataireId)
        {
            return await _db.Promotions
                .Include(p => p.Product)
                .Where(p => p.Product.Store.PrestataireId == prestataireId)
                .ToListAsync();
        }

        // -----------------------------------------------------
        // Ajouter une promotion à un produit du prestataire
        // -----------------------------------------------------
        public async Task<Promotion> AddPromotion(string prestataireId, CreatePromotionDto dto)
        {
            // Vérifier que le produit appartient au prestataire
            var product = await _db.Products
                .Include(p => p.Store)
                .FirstOrDefaultAsync(p => p.Id == dto.ProductId &&
                                          p.Store.PrestataireId == prestataireId);

            if (product == null)
                return null; // produit non autorisé

            var promo = new Promotion
            {
                ProductId = dto.ProductId,
                Title = dto.Title,
                Description = dto.Description,
                DiscountPercent = dto.DiscountPercent,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate
            };

            _db.Promotions.Add(promo);
            await _db.SaveChangesAsync();

            return promo;
        }

        // -----------------------------------------------------
        // Modifier une promotion
        // -----------------------------------------------------
        public async Task<bool> UpdatePromotion(int id, UpdatePromotionDto dto)
        {
            var promo = await _db.Promotions.FindAsync(id);
            if (promo == null)
                return false;

            promo.Title = dto.Title;
            promo.Description = dto.Description;
            promo.DiscountPercent = dto.DiscountPercent;
            promo.StartDate = dto.StartDate;
            promo.EndDate = dto.EndDate;

            await _db.SaveChangesAsync();
            return true;
        }

        // -----------------------------------------------------
        // Supprimer une promotion
        // -----------------------------------------------------
        public async Task<bool> DeletePromotion(int id)
        {
            var promo = await _db.Promotions.FindAsync(id);
            if (promo == null)
                return false;

            _db.Promotions.Remove(promo);
            await _db.SaveChangesAsync();
            return true;
        }
    }
}