using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    // Mở rộng TaskDto để include List<TaskStopDto> cho Create, hỗ trợ gán Prescription
    public class CreateTaskDto : TaskDto  // Kế thừa từ TaskDto
    {
        public List<TaskStopDto> TaskStops { get; set; } = new List<TaskStopDto>();
        public List<CompartmentAssignmentDto>? SuggestedCompartments { get; set; } = new List<CompartmentAssignmentDto>(); // Gợi ý dựa trên stops
        public ulong? PrescriptionId { get; set; } // Mới: Gán đơn thuốc để auto-gán items
        public DateTime? ScheduledStartAt { get; set; }
    }

    // DTO cho assign prescription to task
    public class AssignPrescriptionDto
    {
        [Required]
        public ulong PrescriptionId { get; set; }

        [StringLength(255)]
        public string? CustomNote { get; set; } // Ghi chú tùy chỉnh cho gán
    }

    public class AssignPrescriptionResponseDto
    {
        public ulong TaskId { get; set; }
        public ulong PrescriptionId { get; set; }
        public string PrescriptionCode { get; set; } = null!;
        public ulong PatientId { get; set; }
        public string PatientName { get; set; } = null!;
        public int AssignedItemsCount { get; set; } // Số items gán thành công
        public string Message { get; set; } = null!;
    }
}
