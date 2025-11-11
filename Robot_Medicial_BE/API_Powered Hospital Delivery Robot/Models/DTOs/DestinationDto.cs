using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class DestinationDto
    {
        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        [StringLength(255)]
        public string? Area { get; set; }

        [StringLength(64)]
        public string? Floor { get; set; }

        // 🧭 Thêm 3 thuộc tính mới để FE gửi
        public double? X { get; set; }
        public double? Y { get; set; }
        public ulong? MapId { get; set; }
    }

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
