using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class MapDto
    {
        [Required(ErrorMessage = "MapName is required")]
        [StringLength(255)]
        public string MapName { get; set; } = null!; // Unique - Không cho phép sửa trong Update

        [StringLength(255)]
        public string? NameMapFE { get; set; }

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

    public class MapResponseDto
    {
        public ulong Id { get; set; }
        public string MapName { get; set; } = null!;
        public string? NameMapFE { get; set; }
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
        public int TotalTasks { get; set; } = 0;
        public int TasksToday { get; set; } = 0;
        public int TasksThisWeek { get; set; } = 0;
        public int ActiveRobotsCount => Robots?.Count(r => r.Status?.ToLower() is "transporting" or "awaiting_handover" or "returning_to_station" or "manual_control") ?? 0;
        public IEnumerable<RobotResponseDto> Robots { get; set; } = new List<RobotResponseDto>();
        public List<DestinationResponseDto> Destinations { get; set; } = new();
    }

    public class MapUploadDto
    {
        [Required]
        public string MapName { get; set; } = null!;
        public string? Mode { get; set; }
        public float? Resolution { get; set; }
        public float? OriginX { get; set; }
        public float? OriginY { get; set; }
        public float? OriginZ { get; set; }
        public float? OccupiedThresh { get; set; }
        public float? FreeThresh { get; set; }
        public bool? Negate { get; set; }
    }

    public class MapUploadJsonDto
    {
        public string MapName { get; set; } = null!;
        public string? Mode { get; set; }
        public float? Resolution { get; set; }
        public float? OriginX { get; set; }
        public float? OriginY { get; set; }
        public float? OriginZ { get; set; }
        public float? OccupiedThresh { get; set; }
        public float? FreeThresh { get; set; }
        public bool? Negate { get; set; }
        public string? ImageName { get; set; }
        public string? ImageBase64 { get; set; } // base64 image
    }

    public class MapErrorDto
    {
        public ulong RobotId { get; set; }
        public ulong? MapId { get; set; }
        public string ErrorType { get; set; } = string.Empty; // e.g., obstacle, missing-room, wrong-path
        public string Description { get; set; } = string.Empty;

        // controller sẽ điền từ token
        public string? ReporterEmail { get; set; } = null;
    }
}
