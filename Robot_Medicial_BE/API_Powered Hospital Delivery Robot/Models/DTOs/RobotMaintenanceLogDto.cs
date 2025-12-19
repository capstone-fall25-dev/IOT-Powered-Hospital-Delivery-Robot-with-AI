using API_Powered_Hospital_Delivery_Robot.Helpers;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo nhật ký bảo trì robot
    /// </summary>
    public class RobotMaintenanceLogDto
    {
        [Required]
        public ulong RobotId { get; set; }

        public DateTime MaintenanceDate { get; set; } = DateTimeHelper.Now();

        [StringLength(500)]
        public string? Details { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin nhật ký bảo trì robot
    /// </summary>
    public class RobotMaintenanceLogResponseDto
    {
        public ulong Id { get; set; }
        public ulong RobotId { get; set; }
        public string RobotCode { get; set; } = null!;
        public DateTime MaintenanceDate { get; set; }
        public string? Details { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
