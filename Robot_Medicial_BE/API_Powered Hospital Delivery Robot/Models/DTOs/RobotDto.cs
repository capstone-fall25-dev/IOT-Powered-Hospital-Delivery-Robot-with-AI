using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class RobotDto
    {
        public ulong Id { get; set; }

        [Required]
        [StringLength(32)]
        public string Code { get; set; } = null!; // Unique

        [StringLength(128)]
        public string? Name { get; set; }

        public string? Status { get; set; } 

        [Range(0, 100)]
        public decimal BatteryPercent { get; set; } = 100;

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        [Range(0, 100)]
        public decimal ProgressOverallPct { get; set; } = 0;

        [Range(0, 100)]
        public decimal ProgressLegPct { get; set; } = 0;

        public bool IsMicOn { get; set; } = false;

        public DateTime? EtaDeliveryAt { get; set; }
        public DateTime? EtaReturnAt { get; set; }

        public int ErrorCountSession { get; set; } = 0;

        public ulong? MapId { get; set; } // FK to maps
    }

    // Output DTO (include compartments, tasks)
    public class RobotResponseDto
    {
        public ulong Id { get; set; }
        public string Code { get; set; } = null!;
        public string? Name { get; set; }
        public string Status { get; set; } = null!;
        public decimal BatteryPercent { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal ProgressOverallPct { get; set; }
        public decimal ProgressLegPct { get; set; }
        public bool IsMicOn { get; set; }
        public DateTime? EtaDeliveryAt { get; set; }
        public DateTime? EtaReturnAt { get; set; }
        public int ErrorCountSession { get; set; }
        public DateTime? LastHeartbeatAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ulong? MapId { get; set; }
        public IEnumerable<RobotCompartment> Compartments { get; set; } = new List<RobotCompartment>();
        public IEnumerable<TaskResponseDto> Tasks { get; set; } = new List<TaskResponseDto>(); // Nhiệm vụ hiện tại
    }

    // DTO cho update status
    public class UpdateStatusDto
    {
        [Required]
        public string Status { get; set; } = null!; 
    }

    // DTO cho update position
    public class UpdatePositionDto
    {
        [Range(-90, 90)]
        public decimal Latitude { get; set; }

        [Range(-180, 180)]
        public decimal Longitude { get; set; }
    }

    // DTO cho assign map
    public class AssignMapResponseDto
    {
        public ulong RobotId { get; set; }
        public ulong MapId { get; set; }
        public string MapName { get; set; } = null!;
        public string Message { get; set; } = null!; // VD: "Assigned successfully"
    }
}
