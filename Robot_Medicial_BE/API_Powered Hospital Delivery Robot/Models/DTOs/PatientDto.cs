using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class PatientDto
    {
        [Required]
        [StringLength(64)]
        public string PatientCode { get; set; } = null!; // Unique

        [Required]
        [StringLength(128)]
        public string FullName { get; set; } = null!;

        [Required]
        public string Gender { get; set; } = "other"; // 'male','female','other'

        public DateTime? Dob { get; set; }

        [StringLength(255)]
        public string? Address { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(128)]
        public string? Department { get; set; }

        [StringLength(64)]
        public string? RoomNumber { get; set; }

        public ulong? RoomId { get; set; }

        public string Status { get; set; } = "active";
    }

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
        public string? RoomName { get; set; } // Từ relation
        public DateTime CreatedAt { get; set; }
        public string Status { get; set; }
    }

    public class PatientReportDto
    {
        public string FullName { get; set; } = null!;
        public int TotalVisits { get; set; } // Chỉ count prescriptions (visits = prescriptions in this context)
        public int TotalMedicinesPrescribed { get; set; } // Unique medicines from items
        public DateTime? LastVisit { get; set; } // Last prescription CreatedAt
        public string? CurrentRoom { get; set; } // From Room
    }

    public class PatientMedicineHistoryDto
    {
        public string MedicineName { get; set; } = null!;
        public int TotalPrescribedQuantity { get; set; }
        public DateTime? LastPrescribedAt { get; set; }
        public string? Dosage { get; set; }
    }
}
