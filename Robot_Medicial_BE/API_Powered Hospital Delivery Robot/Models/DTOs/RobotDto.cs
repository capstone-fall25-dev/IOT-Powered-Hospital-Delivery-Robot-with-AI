using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo/cập nhật robot
    /// </summary>
    public class RobotDto
    {
        //public ulong Id { get; set; }

        [Required]
        [StringLength(32)]
        public string? Code { get; set; } = null!; // Unique

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

        public ulong? MapId { get; set; }
        public List<CompartmentDto>? Compartments { get; set; }
    }

    /// <summary>
    /// DTO cho ngăn chứa của robot
    /// </summary>
    public class CompartmentDto
    {
        public ulong Id { get; set; }
        public string? Name { get; set; }
        public string? Code { get; set; }
        public bool IsLocked { get; set; }
        public bool IsActice { get; set; }
        public ulong? CategoryId { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin robot (kèm compartments và tasks)
    /// </summary>
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
        public List<CompartmentDto>? Compartments { get; set; }
        public IEnumerable<TaskResponseDto> Tasks { get; set; } = new List<TaskResponseDto>();
    }

    /// <summary>
    /// DTO cho cập nhật trạng thái robot
    /// </summary>
    public class UpdateStatusDto
    {
        [Required]
        public string Status { get; set; } = null!; 
    }

    /// <summary>
    /// DTO cho cập nhật vị trí robot
    /// </summary>
    public class UpdatePositionDto
    {
        [Range(-90, 90)]
        public decimal Latitude { get; set; }

        [Range(-180, 180)]
        public decimal Longitude { get; set; }
    }

    /// <summary>
    /// DTO cho cập nhật trạng thái robot từ ROS
    /// </summary>
    public class RobotStatusUpdateDto
    {
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = null!; // Mã robot, ví dụ "RB-01"

        [Required]
        [StringLength(50)]
        public string Status { get; set; } = null!;
    }

    /// <summary>
    /// DTO phản hồi gán bản đồ cho robot
    /// </summary>
    public class AssignMapResponseDto
    {
        public ulong RobotId { get; set; }
        public ulong MapId { get; set; }
        public string MapName { get; set; } = null!;
        public string Message { get; set; } = null!;
    }

    /// <summary>
    /// DTO cho cập nhật robot
    /// </summary>
    public class UpdateRobotDto
    {
        public string? Name { get; set; } // Có thể để trống nếu không muốn đổi tên
        public ulong? MapId { get; set; }
        public List<UpdateCompartmentDto> Compartments { get; set; } = new();
    }

    /// <summary>
    /// DTO cho cập nhật ngăn chứa
    /// </summary>
    public class UpdateCompartmentDto
    {
        public ulong CategoryId { get; set; }
        public bool IsLocked { get; set; } = false;
    }
}
