using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class PrescriptionDto
    {
        [Required]
        [StringLength(64)]
        public string PrescriptionCode { get; set; } = null!; // Unique

        [Required]
        public ulong PatientId { get; set; }

        public ulong? UsersId { get; set; } // Current user

        public string Status { get; set; } = "pending"; // enum

        public List<PrescriptionItemDto> Items { get; set; } = new List<PrescriptionItemDto>();
    }

    public class PrescriptionResponseDto
    {
        public ulong Id { get; set; }
        public string PrescriptionCode { get; set; } = null!;
        public ulong PatientId { get; set; }
        public string? PatientName { get; set; }
        public ulong? UserId { get; set; }
        public string? UserEmail { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public IEnumerable<PrescriptionItemResponseDto> Items { get; set; } = new List<PrescriptionItemResponseDto>();
    }
}
