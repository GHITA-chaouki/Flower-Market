namespace backend.Models
{
    public class Order
    {
        public int Id { get; set; }

        public int ProductId { get; set; }
        public Product Product { get; set; }

        public int StoreId { get; set; }
        public Store Store { get; set; }

        public string UserId { get; set; }
        public AppUser User { get; set; }

        public DateTime CreatedAt { get; set; }
        public int Quantity { get; set; }
        public double TotalPrice { get; set; }

        // Adresse de livraison renseignée lors de la commande
        public string? ShippingAddress { get; set; }
        // Téléphone du client renseigné lors de la commande (optionnel)
        public string? CustomerPhone { get; set; }

        public string Status { get; set; } = "pending"; // pending/confirmed/processing/shipped/delivered/cancelled
        public string? PaymentMethod { get; set; } // Card / Cash

    }
}