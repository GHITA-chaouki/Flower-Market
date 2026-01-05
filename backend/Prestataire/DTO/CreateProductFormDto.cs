using Microsoft.AspNetCore.Http;

namespace backend.Prestataire.Dto
{
    public class CreateProductFormDto
    {
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public string Category { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;

        // optionnels
        public string? ImageUrl { get; set; }
        public IFormFile? Image { get; set; }
    }
}
