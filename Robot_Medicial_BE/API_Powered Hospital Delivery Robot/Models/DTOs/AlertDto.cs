using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class ReportDamagedMedicineDto
    {
        [Required]
        public ulong PrescriptionItemId { get; set; } // Item cụ thể hỏng

        [Required]
        [StringLength(255)]
        public string Reason { get; set; } = null!;

        [StringLength(500)]
        public string? Description { get; set; } 

        [Required] // Require TaskId to fetch RobotId, as alerts.robot_id is NOT NULL
        public ulong TaskId { get; set; } // Liên kết task để lấy robot_id
    }

    public class ReportDamagedMedicineResponseDto
    {
        public ulong AlertId { get; set; }
        public ulong PrescriptionItemId { get; set; }
        public string Reason { get; set; } = null!;
        public string Description { get; set; } = null!;
        public ulong TaskId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Message { get; set; } = null!; // "Alert created successfully"
    }

    public class AlertDto
    {
        [Required]
        public ulong RobotId { get; set; }
        
        [Required]
        public string Severity { get; set; } = "low"; // enum: 'low','medium','high','critical'
        
        [Required]
        public string Category { get; set; } = null!; // enum: 'battery','network','obstacle','system','manual'
        
        [Required]
        public string Status { get; set; } = "open"; // enum: 'open','acknowledged','resolved'
        
        [Required]
        [StringLength(500)]
        public string Message { get; set; } = null!;
        public ulong? PrescriptionItemId { get; set; }
    }

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