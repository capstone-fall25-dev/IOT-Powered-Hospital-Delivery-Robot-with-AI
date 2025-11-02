namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    // DTO để theo dõi online/làm gì?
    public class SessionResponseDto
    {
        public ulong Id { get; set; }
        public string SessionToken { get; set; } = null!;
        public string? IpAddress { get; set; } // IP để track vị trí
        public string? UserAgent { get; set; } // Browser/device để track hoạt động
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}
