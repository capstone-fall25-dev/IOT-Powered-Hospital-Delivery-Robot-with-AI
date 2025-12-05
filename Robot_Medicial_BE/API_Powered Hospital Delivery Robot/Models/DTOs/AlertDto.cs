using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho báo cáo thuốc bị hỏng
    /// </summary>
    public class ReportDamagedMedicineDto
    {
        [Required]
        public ulong PrescriptionItemId { get; set; }

        [Required]
        [StringLength(255)]
        public string Reason { get; set; } = null!;

        [StringLength(500)]
        public string? Description { get; set; } 

        [Required]
        public ulong TaskId { get; set; }
    }

    /// <summary>
    /// DTO phản hồi báo cáo thuốc bị hỏng
    /// </summary>
    public class ReportDamagedMedicineResponseDto
    {
        public ulong AlertId { get; set; }
        public ulong PrescriptionItemId { get; set; }
        public string Reason { get; set; } = null!;
        public string Description { get; set; } = null!;
        public ulong TaskId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Message { get; set; } = null!;
    }

    /// <summary>
    /// DTO cho tạo cảnh báo
    /// </summary>
    public class AlertDto
    {
        [Required]
        public ulong RobotId { get; set; }
        
        [Required]
        public string Severity { get; set; } = "low";
        
        [Required]
        public string Category { get; set; } = null!;
        
        [Required]
        public string Status { get; set; } = "open";
        
        [Required]
        [StringLength(500)]
        public string Message { get; set; } = null!;
        public ulong? PrescriptionItemId { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin cảnh báo
    /// </summary>
    public class AlertResponseDto
    {
        public ulong Id { get; set; }
        public ulong RobotId { get; set; }
        public string Severity { get; set; } = null!;
        public string Category { get; set; } = null!;
        public string Status { get; set; } = null!;
        public string Message { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
        public ulong? PrescriptionItemId { get; set; }
    }
}