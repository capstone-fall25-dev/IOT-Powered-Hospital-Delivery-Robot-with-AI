using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
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
