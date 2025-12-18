using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo bệnh nhân mới
    /// </summary>
    public class PatientCreateDto
    {
        [Required, StringLength(64)]
        public string PatientCode { get; set; } = null!;

        [Required, StringLength(128)]
        public string FullName { get; set; } = null!;

        [Required]
        public string Gender { get; set; } = "other"; // male / female / other

        public DateTime? Dob { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public string? RoomNumber { get; set; }
        public ulong? RoomId { get; set; }

        public string Status { get; set; } = "active";
    }

    /// <summary>
    /// DTO cho cập nhật thông tin bệnh nhân (các trường tùy chọn)
    /// </summary>
    public class PatientUpdateDto
    {
        [StringLength(64)]
        public string? PatientCode { get; set; }

        [StringLength(128)]
        public string? FullName { get; set; }

        public string? Gender { get; set; }
        public DateTime? Dob { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public string? RoomNumber { get; set; }
        public ulong? RoomId { get; set; }

        public string? Status { get; set; }
    }

    /// <summary>
    /// DTO cho lọc danh sách bệnh nhân
    /// </summary>
    public class PatientFilterDto
    {
        public string? Keyword { get; set; }    // Tìm theo tên, mã BN, khoa, phòng
        public string? Status { get; set; }
    }

    /// <summary>
    /// DTO cho xuất viện bệnh nhân
    /// </summary>
    public class DischargeDto
    {
        public string? Reason { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin bệnh nhân
    /// </summary>
    public class PatientResponseDto
    {
        public ulong Id { get; set; }
        public string PatientCode { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Gender { get; set; } = null!;
        public DateTime? Dob { get; set; }
        public string? Address { get; set; }
        public string? Phone { get; set; }
        public string? Department { get; set; }
        public string? RoomNumber { get; set; }
        public ulong? RoomId { get; set; }
        public string? RoomName { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; } = null!;
    }

    /// <summary>
    /// DTO cho báo cáo bệnh nhân
    /// </summary>
    public class PatientReportDto
    {
        public string FullName { get; set; } = null!;
        public int TotalVisits { get; set; }
        public int TotalMedicinesPrescribed { get; set; }
        public DateTime? LastVisit { get; set; }
        public string? CurrentRoom { get; set; }
    }

    /// <summary>
    /// DTO cho lịch sử nhận thuốc của bệnh nhân
    /// </summary>
    public class PatientMedicineHistoryDto
    {
        public string MedicineName { get; set; } = null!;
        public string? PrescriptionCode { get; set; } // Mã đơn thuốc (customName)
        public int TotalPrescribedQuantity { get; set; }
        public DateTime? LastPrescribedAt { get; set; }
    }
}
