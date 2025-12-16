using API_Powered_Hospital_Delivery_Robot.Helpers;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// Độ ưu tiên của task
    /// </summary>
    public enum TaskPriority
    {
        Normal,
        Urgent,
        Critical
    }

    /// <summary>
    /// DTO cho tạo task mới
    /// </summary>
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

    /// <summary>
    /// DTO cho tạo điểm dừng của task
    /// </summary>
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

        // Mã đơn thuốc (bắt buộc nếu loại ngăn chứa liên quan đến thuốc)
        public string? PrescriptionCode { get; set; }

        public string? CustomName { get; set; }

        // FE nhập mô tả vật phẩm (tùy chọn)
        public string? ItemDesc { get; set; }
    }

    /// <summary>
    /// DTO cho cập nhật task
    /// </summary>
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

    /// <summary>
    /// DTO cho cập nhật điểm dừng của task
    /// </summary>
    public class UpdateTaskStopDto
    {
        // Id stop hiện tại trong DB
        public ulong StopId { get; set; }

        public int SeqNo { get; set; }
        public ulong DestinationId { get; set; }
        public ulong PatientId { get; set; }
        public ulong CompartmentId { get; set; }
        public ulong CategoryId { get; set; }

        // Mã đơn thuốc (bắt buộc nếu loại ngăn chứa liên quan đến thuốc)
        public string? PrescriptionCode { get; set; }

        public string? CustomName { get; set; }
        public string? ItemDesc { get; set; }
        public string? Status { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin task chuẩn
    /// </summary>
    public class TaskResponseDto
    {
        public ulong Id { get; set; }

        public string? RobotName { get; set; }
        public string Status { get; set; } 
        public TaskPriority Priority { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime? ScheduledStartAt { get; set; }

        public string? AssignedByEmail { get; set; }
        public string? AssignedByFullName { get; set; }

        // Chi tiết các điểm dừng
        public List<TaskStopResponseDto> Stops { get; set; } = new();
    }

    /// <summary>
    /// DTO phản hồi thông tin điểm dừng của task
    /// </summary>
    public class TaskStopResponseDto
    {
        public int SeqNo { get; set; }
        public string? PatientName { get; set; }
        public string? DestinationName { get; set; }
        public string? CompartmentCode { get; set; }

        public PrescriptionSummaryDto? Prescription { get; set; }
    }

    /// <summary>
    /// DTO tóm tắt đơn thuốc
    /// </summary>
    public class PrescriptionSummaryDto
    {
        public string Code { get; set; } = "";
        public List<PrescriptionItemResponseDto> Items { get; set; } = new();
    }

    /// <summary>
    /// DTO cho danh sách task (tối ưu cho trang list)
    /// </summary>
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
        public DateTime? StartedAt { get; set; }

        // Stop summary
        public int TotalStops { get; set; }
        public int CompletedStops { get; set; } // Số stops đã delivered
        public string? FirstDestination { get; set; }

        // Patient + medicine summary (dạng list)
        public List<PatientStopSummaryDto> Patients { get; set; } = new();
    }

    /// <summary>
    /// DTO tóm tắt bệnh nhân tại điểm dừng
    /// </summary>
    public class PatientStopSummaryDto
    {
        public string PatientName { get; set; } = "";
        public string MedicineSummary { get; set; } = "";
        public string? CustomName { get; set; }
        public string? ItemDesc { get; set; }
    }

    /// <summary>
    /// DTO cho lọc danh sách task
    /// </summary>
    public class TaskFilterDto
    {
        public ulong? RobotId { get; set; }
        public string? Status { get; set; }
        public string? Priority { get; set; }
    }

    /// <summary>
    /// DTO chi tiết task
    /// </summary>
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

    /// <summary>
    /// DTO chi tiết điểm dừng của task
    /// </summary>
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
        public string? CustomName { get; set; }
        public string ItemDesc { get; set; } = "";
        public string StopStatus { get; set; } = "";        // ⭐ TRẢ VỀ STATUS CHUẨN CỦA STOP
        public string AssignmentStatus { get; set; } = "";  // ⭐ SẼ = StopStatus để FE hiển thị

        // PRESCRIPTION (FULL)
        public PrescriptionFullDto? Prescription { get; set; }
    }

    /// <summary>
    /// DTO đầy đủ thông tin đơn thuốc
    /// </summary>
    public class PrescriptionFullDto
    {
        public string PrescriptionCode { get; set; } = "";
        public DateTime CreatedAt { get; set; }

        public string Status { get; set; } = "";

        public List<PrescriptionItemResponseDto> Items { get; set; } = new();
    }

    /// <summary>
    /// DTO cho chỉnh sửa task
    /// </summary>
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

    /// <summary>
    /// DTO cho chỉnh sửa điểm dừng của task
    /// </summary>
    public class TaskEditStopDto
    {
        public ulong StopId { get; set; }
        public int SeqNo { get; set; }

        public ulong DestinationId { get; set; }
        public ulong PatientId { get; set; }

        public ulong CategoryId { get; set; }
        public ulong CompartmentId { get; set; }
        public string? CompartmentCode { get; set; } // Thêm CompartmentCode để frontend không cần load lại

        public string? CustomName { get; set; }
        public string? ItemDesc { get; set; }

        public string? Status { get; set; }
    }

    /// <summary>
    /// DTO cho thay đổi trạng thái task
    /// </summary>
    public class TaskStatusChangeDto
    {
        public string Status { get; set; } = "";
    }

    /// <summary>
    /// DTO thông tin task để chạy
    /// </summary>
    public class RunTaskInfoDto
    {
        public ulong TaskId { get; set; }
        public ulong RobotId { get; set; }
        public ulong MapId { get; set; }
        public string MapName { get; set; } = "";
        public List<RunTaskStopDto> Stops { get; set; } = new();
    }

    /// <summary>
    /// DTO điểm dừng để chạy task
    /// </summary>
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

    /// <summary>
    /// DTO kết quả cập nhật điểm dừng
    /// </summary>
    public class StopUpdateResultDto
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public TaskDetailDto? Task { get; set; }
    }

    /// <summary>
    /// DTO cho thay đổi trạng thái điểm dừng
    /// </summary>
    public class StopStatusChangeDto
    {
        public string Status { get; set; } = "";
    }

    /// <summary>
    /// DTO cho hủy task
    /// </summary>
    public class CancelTaskDto
    {
        public string? Reason { get; set; }
    }

}


