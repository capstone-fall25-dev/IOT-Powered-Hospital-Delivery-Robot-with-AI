using API_Powered_Hospital_Delivery_Robot.Helpers;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    // =====================================
    //  ENUM — PRIORITY
    // =====================================
    public enum TaskPriority
    {
        Normal,
        Urgent,
        Critical
    }

    // =====================================
    //  SECTION 1 — CREATE / UPDATE DTOs
    // =====================================

    public class CreateTaskDto
    {
        [Required(ErrorMessage = "Vui lòng chọn bản đồ.")]
        public ulong MapId { get; set; }

        [Required(ErrorMessage = "Vui lòng chọn robot.")]
        public ulong RobotId { get; set; }

        public TaskPriority Priority { get; set; } = TaskPriority.Normal;

        [FutureDate(ErrorMessage = "Thời gian bắt đầu phải là trong tương lai.")]
        public DateTime? ScheduledStartAt { get; set; }

        [Required(ErrorMessage = "Cần ít nhất một điểm dừng.")]
        [MinLength(1, ErrorMessage = "Phải có ít nhất một điểm dừng.")]
        public List<CreateTaskStopDto> Stops { get; set; } = null!;
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

        // FE nhập mô tả vật phẩm (tùy chọn)
        public string? ItemDesc { get; set; }
    }

    public class UpdateTaskDto
    {
        // Cho phép đổi robot / map / priority / giờ bắt đầu
        public ulong? RobotId { get; set; }
        public ulong? MapId { get; set; }
        public TaskPriority? Priority { get; set; }
        public DateTime? ScheduledStartAt { get; set; }

        // nếu cần vẫn cho phép đổi status (ví dụ cancel)
        public string? Status { get; set; }

        // Danh sách điểm dừng cần update (optional)
        public List<UpdateTaskStopDto>? Stops { get; set; }
    }

    public class UpdateTaskStopDto
    {
        // Id stop hiện tại trong DB
        public ulong StopId { get; set; }

        public int SeqNo { get; set; }
        public ulong DestinationId { get; set; }
        public ulong PatientId { get; set; }
        public ulong CompartmentId { get; set; }
        public ulong CategoryId { get; set; }

        public string? CustomName { get; set; }
        public string? ItemDesc { get; set; }
        public string? Status { get; set; }
    }

    // =====================================
    //  SECTION 2 — STANDARD TASK RESPONSE
    // =====================================

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

        // Chi tiết các điểm dừng
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

    // =====================================
    //  SECTION 3 — LIST VIEW DTOs
    //        (Tối ưu cho trang list)
    // =====================================

    public class TaskListItemDto
    {
        // Basic info
        public ulong Id { get; set; }
        public string RobotName { get; set; } = "";
        public string AssignedBy { get; set; } = "";
        public string Status { get; set; } = "";
        public TaskPriority Priority { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledStartAt { get; set; }

        // Stop summary
        public int TotalStops { get; set; }
        public string? FirstDestination { get; set; }

        // Patient + medicine summary (dạng list)
        public List<PatientStopSummaryDto> Patients { get; set; } = new();
    }

    public class PatientStopSummaryDto
    {
        public string PatientName { get; set; } = "";
        public string MedicineSummary { get; set; } = "";
    }

    // =====================================
    //  SECTION 4 — FILTER DTO
    // =====================================
    public class TaskFilterDto
    {
        public ulong? RobotId { get; set; }
        public string? Status { get; set; }
        public string? Priority { get; set; }
    }

    public class TaskDetailDto
    {
        // ========================
        // TASK INFORMATION
        // ========================
        public ulong Id { get; set; }
        public string RobotName { get; set; } = "";
        public string Status { get; set; } = "";
        public TaskPriority Priority { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledStartAt { get; set; }

        public string? AssignedByEmail { get; set; }
        public string? AssignedByFullName { get; set; }

        public string? MapName { get; set; }

        // ========================
        // STOPS (FULL DETAIL)
        // ========================
        public List<TaskDetailStopDto> Stops { get; set; } = new();
    }

    public class TaskDetailStopDto
    {
        public ulong StopId { get; set; }

        public int SeqNo { get; set; }

        // DESTINATION
        public string DestinationName { get; set; } = "";

        // PATIENT
        public string PatientName { get; set; } = "";
        public string PatientCode { get; set; } = "";
        public string? RoomNumber { get; set; }
        public string? Department { get; set; }

        // COMPARTMENT
        public string CompartmentCode { get; set; } = "";
        public string CompartmentStatus { get; set; } = "";
        public string? CompartmentCategory { get; set; }

        // ASSIGNMENT
        public string ItemDesc { get; set; } = "";
        public string StopStatus { get; set; } = "";        // ⭐ TRẢ VỀ STATUS CHUẨN CỦA STOP
        public string AssignmentStatus { get; set; } = "";  // ⭐ SẼ = StopStatus để FE hiển thị

        // PRESCRIPTION (FULL)
        public PrescriptionFullDto? Prescription { get; set; }
    }

    public class PrescriptionFullDto
    {
        public string PrescriptionCode { get; set; } = "";
        public DateTime CreatedAt { get; set; }

        public string Status { get; set; } = "";

        public List<PrescriptionItemResponseDto> Items { get; set; } = new();
    }

    public class TaskEditDto
    {
        public ulong Id { get; set; }
        public ulong MapId { get; set; }
        public ulong RobotId { get; set; }

        public TaskPriority Priority { get; set; }
        public DateTime? ScheduledStartAt { get; set; }
        public string? Status { get; set; }
        public List<TaskEditStopDto> Stops { get; set; } = new();
    }

    public class TaskEditStopDto
    {
        public ulong StopId { get; set; }
        public int SeqNo { get; set; }

        public ulong DestinationId { get; set; }
        public ulong PatientId { get; set; }

        public ulong CategoryId { get; set; }
        public ulong CompartmentId { get; set; }

        public string? CustomName { get; set; }
        public string? ItemDesc { get; set; }

        public string? Status { get; set; }
    }

    public class TaskStatusChangeDto
    {
        public string Status { get; set; } = "";
    }

    public class RunTaskInfoDto
    {
        public ulong TaskId { get; set; }
        public ulong RobotId { get; set; }
        public ulong MapId { get; set; }
        public string MapName { get; set; } = "";
        public List<RunTaskStopDto> Stops { get; set; } = new();
    }

    public class RunTaskStopDto
    {
        public ulong StopId { get; set; }
        public int Order { get; set; }
        public ulong DestinationId { get; set; }
        public string Name { get; set; } = "";
        public double X { get; set; }
        public double Y { get; set; }
        public string AssignmentStatus { get; set; } = "pending";
    }
    public class StopUpdateResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public TaskDetailDto? Task { get; set; }
    }
    public class StopStatusChangeDto
    {
        public string Status { get; set; } = "";
    }

}


