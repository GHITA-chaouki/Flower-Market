using System;
using System.ComponentModel.DataAnnotations;

namespace backend.Admin.Dto
{
    public class AdminProductDto
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; }

        [Required]
        [Range(0, double.MaxValue)]
        public decimal Price { get; set; }

        public string? ImageUrl { get; set; }
        public string? Description { get; set; }
        public string? Category { get; set; }
        public int Stock { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }

        // Store information
        public int StoreId { get; set; }
        public string? StoreName { get; set; }

        // Prestataire information
        public string? PrestataireId { get; set; }
        public string? PrestataireName { get; set; }
        public string? PrestataireEmail { get; set; }

        // Additional properties
        public int TotalOrders { get; set; }
        public double AverageRating { get; set; }

        public List<PromotionDto> Promotions { get; set; } = new List<PromotionDto>();
    }

    public class PromotionDto
    {
        public string? Title { get; set; }
        public double DiscountPercent { get; set; }
        public DateTime EndDate { get; set; }
    }
}
