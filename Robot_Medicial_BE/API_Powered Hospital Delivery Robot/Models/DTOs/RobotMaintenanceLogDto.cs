using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class RobotMaintenanceLogDto
    {
        [Required]
        public ulong RobotId { get; set; }

        public DateTime MaintenanceDate { get; set; } = DateTime.UtcNow;

        [StringLength(500)] // Giới hạn details
        public string? Details { get; set; }
    }

    public class RobotMaintenanceLogResponseDto
    {
        public ulong Id { get; set; }
        public ulong RobotId { get; set; }
        public string RobotCode { get; set; } = null!; // Từ relation
        public DateTime MaintenanceDate { get; set; }
        public string? Details { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
