using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo đơn thuốc mới
    /// </summary>
    public class PrescriptionCreateDto
    {
        public string PrescriptionCode { get; set; } = null!;
        public ulong PatientId { get; set; }
        public string Status { get; set; } = "pending";

        // optional
        public List<PrescriptionItemCreateDto> Items { get; set; } = new();
    }

    /// <summary>
    /// DTO cho cập nhật đơn thuốc
    /// </summary>
    public class PrescriptionUpdateDto
    {
        public string? PrescriptionCode { get; set; }
        public ulong? PatientId { get; set; }
        public string? Status { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin đơn thuốc
    /// </summary>
    public class PrescriptionResponseDto
    {
        public ulong Id { get; set; }
        public string PrescriptionCode { get; set; } = "";
        public ulong PatientId { get; set; }
        public string? PatientName { get; set; }
        public string Status { get; set; } = "";
        public DateTime CreatedAt { get; set; }

        public List<PrescriptionItemResponseDto> Items { get; set; } = new();
    }

    /// <summary>
    /// DTO cho tạo mục thuốc trong đơn thuốc
    /// </summary>
    public class PrescriptionItemCreateDto
    {
        public ulong PrescriptionId { get; set; }
        public ulong MedicineId { get; set; }
        public int Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Instructions { get; set; }
    }

    /// <summary>
    /// DTO cho cập nhật mục thuốc trong đơn thuốc
    /// </summary>
    public class PrescriptionItemUpdateDto
    {
        public ulong MedicineId { get; set; }
        public int Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Instructions { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin mục thuốc trong đơn thuốc
    /// </summary>
    public class PrescriptionItemResponseDto
    {
        public ulong Id { get; set; }
        public ulong MedicineId { get; set; }
        public string MedicineCode { get; set; } = "";
        public string MedicineName { get; set; } = "";
        public int Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Instructions { get; set; }
    }

    /// <summary>
    /// DTO cho duyệt đơn thuốc theo mã code
    /// </summary>
    public class ApprovePrescriptionByCodeDto
    {
        [Required(ErrorMessage = "Mã đơn thuốc là bắt buộc")]
        public string PrescriptionCode { get; set; } = null!;
    }
}
