namespace backend.Auth.Dto
{
    public class FirebaseExchangeDto
    {
        public string FirebaseUid { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? Role { get; set; }
        public string? FullName { get; set; }
        public bool? IsApproved { get; set; }
    }
}
