using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class PrescriptionItemDto
    {
        [Required]
        public ulong MedicineId { get; set; }

        [Required]
        [Range(0, int.MaxValue)]
        public int Quantity { get; set; }

        [StringLength(128)]
        public string? Dosage { get; set; }

        [StringLength(255)]
        public string? Instructions { get; set; }
    }

    public class PrescriptionItemResponseDto
    {
        public ulong Id { get; set; }
        public ulong MedicineId { get; set; }
        public string? MedicineName { get; set; }
        public int Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Instructions { get; set; }
    }
}
