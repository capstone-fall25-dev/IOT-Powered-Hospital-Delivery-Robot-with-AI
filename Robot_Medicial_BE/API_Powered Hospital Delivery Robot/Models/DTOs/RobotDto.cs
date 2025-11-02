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
        public decimal BatteryPercent { get; set; } = 100; 
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public decimal ProgressOverallPct { get; set; } = 0;
        public decimal ProgressLegPct { get; set; } = 0;
        public bool IsMicOn { get; set; }
        public DateTime? EtaDeliveryAt { get; set; }
        public DateTime? EtaReturnAt { get; set; }
        public int ErrorCountSession { get; set; } = 0;
    }

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
        public IEnumerable<RobotCompartment>? Compartments { get; set; } 
    }

    public class UpdateStatusDto
    {
        [Required]
        public string Status { get; set; }
    }

    public class UpdateLocationDto
    {
        public decimal Latitude { get; set; }
        public decimal Longitude { get; set; }
    }
}
