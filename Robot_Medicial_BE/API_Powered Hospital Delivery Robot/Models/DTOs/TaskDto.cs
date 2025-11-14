using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public enum TaskPriority
    {
        Normal,
        Urgent,
        Critical
    }

    // ========== CREATE / UPDATE ==========
    public class CreateTaskDto
    {
        [Required(ErrorMessage = "Vui lòng chọn bản đồ.")]
        public ulong MapId { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn robot.")]
        public ulong RobotId { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn mức độ ưu tiên.")]
        public TaskPriority Priority { get; set; }

        public DateTime? ScheduledStartAt { get; set; }

        [Required(ErrorMessage = "Cần ít nhất một điểm dừng.")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất một điểm dừng.")]
        public List<CreateTaskStopDto> Stops { get; set; } = new();
    }

    public class CreateTaskStopDto
    {
        [Required] 
        public int SeqNo { get; set; }

        [Required(ErrorMessage = "Phải chọn điểm đến.")]
        public ulong DestinationId { get; set; }

        [Required(ErrorMessage = "Phải chọn bệnh nhân.")]
        public ulong PatientId { get; set; }

        [Required(ErrorMessage = "Phải chọn khoang.")]
        public ulong CompartmentId { get; set; }

        [Required(ErrorMessage = "Phải chọn loại ngăn chứa.")]
        public ulong CategoryId { get; set; }

        public string? CustomName { get; set; }
    }

    public class UpdateTaskDto
    {
        public string? Status { get; set; }
        public TaskPriority? Priority { get; set; }
    }

    public class TaskFilterDto
    {
        public ulong? RobotId { get; set; }
        public string? Status { get; set; }
        public string? Priority { get; set; }
    }

    // ========== RESPONSE ==========
    public class TaskResponseDto
    {
        public ulong Id { get; set; }
        public string? RobotName { get; set; }
        public string Status { get; set; } = "pending";
        public TaskPriority Priority { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledStartAt { get; set; }
        public string? AssignedByEmail { get; set; }
        public string? AssignedByFullName { get; set; }
        public List<TaskStopResponseDto> Stops { get; set; } = new();
    }

    public class TaskStopResponseDto
    {
        public int SeqNo { get; set; }
        public string? PatientName { get; set; }
        public string? DestinationName { get; set; }
        public string? CompartmentCode { get; set; }
        public PrescriptionSummaryDto? Prescription { get; set; }
    }

    public class PrescriptionSummaryDto
    {
        public string Code { get; set; } = "";
        public List<PrescriptionItemResponseDto> Items { get; set; } = new();
    }
}
