using Microsoft.AspNetCore.Identity;

namespace backend.Models
{
    public class AppUser : IdentityUser
    {
        public string FullName { get; set; } = string.Empty;
        public bool IsApproved { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public ICollection<Review> Reviews { get; set; } = new List<Review>();
        
        // Navigation property pour accéder au magasin associé (pour les prestataires)
        public Store? Store { get; set; }


        // IdentityUser a déjà: Id, UserName, Email, etc.
    }
}
