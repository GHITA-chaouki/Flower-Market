using Microsoft.AspNetCore.Http;

namespace backend.Prestataire.Dto
{
    public class UpdateProductFormDto
    {
        public string Name { get; set; } = "";
        public decimal Price { get; set; }
        public int Stock { get; set; }
        public string Category { get; set; } = "";
        public string Description { get; set; } = "";
        public string? ImageUrl { get; set; }
        public IFormFile? Image { get; set; }
        public bool IsActive { get; set; } = true;
    }
}

