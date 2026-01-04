using backend.Data;
using backend.Prestataire.Dto;
using Microsoft.EntityFrameworkCore;

namespace backend.Prestataire
{
    public class ReviewsService
    {
        private readonly FlowerMarketDbContext _db;

        public ReviewsService(FlowerMarketDbContext db)
        {
            _db = db;
        }

        // ------------------------------------------------------
        // Créer un avis
        // ------------------------------------------------------
        public async Task<Review> AddReview(string userId, CreateReviewDto dto)
        {
            var product = await _db.Products.FindAsync(dto.ProductId);
            if (product == null)
                return null; // Le produit n'existe pas

            var review = new Review
            {
                ProductId = dto.ProductId,
                UserId = userId,
                Rating = dto.Rating,
                Comment = dto.Comment,
                CreatedAt = DateTime.UtcNow
            };

            _db.Reviews.Add(review);

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                throw new Exception($"Error saving review: {ex.Message}");
            }

            return review;
        }

        // ------------------------------------------------------
        // Supprimer un avis
        // ------------------------------------------------------
        public async Task<bool> DeleteReview(int reviewId)
        {
            var review = await _db.Reviews.FindAsync(reviewId);
            if (review == null)
                return false; // L'avis n'existe pas

            _db.Reviews.Remove(review);

            try
            {
                await _db.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error deleting review: {ex.Message}");
            }
        }

        // ------------------------------------------------------
        // Récupérer les avis d'un produit
        // ------------------------------------------------------
        public async Task<List<Review>> GetReviewsByProductId(int productId)
        {
            return await _db.Reviews
                .Where(r => r.ProductId == productId)
                .ToListAsync();
        }

        // ------------------------------------------------------
        // Modifier un avis
        // ------------------------------------------------------
        public async Task<bool> UpdateReview(int reviewId, UpdateReviewDto dto)
        {
            var review = await _db.Reviews.FindAsync(reviewId);
            if (review == null)
                return false; // L'avis n'existe pas

            review.Rating = dto.Rating;
            review.Comment = dto.Comment;

            try
            {
                await _db.SaveChangesAsync();
                return true;
            }
            catch (Exception ex)
            {
                throw new Exception($"Error updating review: {ex.Message}");
            }
        }
    }
}
