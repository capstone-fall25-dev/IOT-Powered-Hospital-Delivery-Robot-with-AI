using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    // ============================================
    // CREATE
    // ============================================
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

    // ============================================
    // UPDATE (PATCH-like – optional fields)
    // ============================================
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

    // ============================================
    // FILTER — NO PAGINATION
    // ============================================
    public class PatientFilterDto
    {
        public string? Keyword { get; set; }    // Tìm theo tên, mã BN, khoa, phòng
        public string? Status { get; set; }     // active / discharged / null = all
    }

    // ============================================
    // DISCHARGE
    // ============================================
    public class DischargeDto
    {
        public string? Reason { get; set; }
    }

    // ============================================
    // RESPONSE
    // ============================================
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

    // ============================================
    // REPORT
    // ============================================
    public class PatientReportDto
    {
        public string FullName { get; set; } = null!;
        public int TotalVisits { get; set; }
        public int TotalMedicinesPrescribed { get; set; }
        public DateTime? LastVisit { get; set; }
        public string? CurrentRoom { get; set; }
    }

    // ============================================
    // MEDICINE HISTORY
    // ============================================
    public class PatientMedicineHistoryDto
    {
        public string MedicineName { get; set; } = null!;
        public int TotalPrescribedQuantity { get; set; }
        public DateTime? LastPrescribedAt { get; set; }
        public string? Dosage { get; set; }
    }
}
