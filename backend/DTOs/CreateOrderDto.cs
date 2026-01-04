namespace backend.DTOs
{
    public class CreateOrderDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }

        // Nouvelle info optionnelle pour la livraison
        public string? ShippingAddress { get; set; }
        public string? Phone { get; set; }
        public string? PaymentMethod { get; set; }
    }
}
