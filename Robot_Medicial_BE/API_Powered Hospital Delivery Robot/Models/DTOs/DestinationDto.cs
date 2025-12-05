using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo/cập nhật điểm đến
    /// </summary>
    public class DestinationDto
    {
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        [StringLength(255)]
        public string? Area { get; set; }

        [StringLength(64)]
        public string? Floor { get; set; }
        public double? X { get; set; }
        public double? Y { get; set; }
        public ulong? MapId { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin điểm đến
    /// </summary>
    public class DestinationResponseDto
    {
        public ulong Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Area { get; set; }
        public string? Floor { get; set; }
        public double? X { get; set; }
        public double? Y { get; set; }
        public ulong? MapId { get; set; }
        public DateTime CreatedAt { get; set; }
        public int TaskCount { get; set; }
    }
}
