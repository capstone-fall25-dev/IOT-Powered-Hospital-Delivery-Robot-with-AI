using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class MapDto
    {
        [Required]
        [StringLength(255)]
        public string MapName { get; set; } = null!; // Unique

        [StringLength(255)]
        public string? ImageName { get; set; }

        [Range(1, int.MaxValue)]
        public int? Width { get; set; }

        [Range(1, int.MaxValue)]
        public int? Height { get; set; }

        [Range(0, double.MaxValue)]
        public double? Resolution { get; set; }

        public double? OriginX { get; set; }
        public double? OriginY { get; set; }
        public double? OriginZ { get; set; }

        [StringLength(50)]
        public string? Mode { get; set; }

        public bool? Negate { get; set; }

        [Range(0, 1)]
        public double? OccupiedThresh { get; set; } // 0-1

        [Range(0, 1)]
        public double? FreeThresh { get; set; } // 0-1
    }

    // Output DTO (include robots sử dụng map)
    public class MapResponseDto
    {
        public ulong Id { get; set; }
        public string MapName { get; set; } = null!;
        public string? ImageName { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public double? Resolution { get; set; }
        public double? OriginX { get; set; }
        public double? OriginY { get; set; }
        public double? OriginZ { get; set; }
        public string? Mode { get; set; }
        public bool? Negate { get; set; }
        public double? OccupiedThresh { get; set; }
        public double? FreeThresh { get; set; }
        public DateTime CreatedAt { get; set; }
        public byte[]? ImageData { get; set; }
        public IEnumerable<RobotResponseDto> Robots { get; set; } = new List<RobotResponseDto>(); // Robots dùng map này
    }
}
