using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class PrescriptionCreateDto
    {
        public string PrescriptionCode { get; set; } = null!;
        public ulong PatientId { get; set; }
        public string Status { get; set; } = "pending";

        // optional
        public List<PrescriptionItemCreateDto> Items { get; set; } = new();
    }

    public class PrescriptionUpdateDto
    {
        public string? PrescriptionCode { get; set; }
        public ulong? PatientId { get; set; }
        public string? Status { get; set; }
    }

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

    public class PrescriptionItemCreateDto
    {
        public ulong PrescriptionId { get; set; }
        public ulong MedicineId { get; set; }
        public int Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Instructions { get; set; }
    }

    public class PrescriptionItemUpdateDto
    {
        public ulong MedicineId { get; set; }
        public int Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Instructions { get; set; }
    }

    public class PrescriptionItemResponseDto
    {
        public ulong Id { get; set; }
        public ulong MedicineId { get; set; }
        public string MedicineCode { get; set; }
        public string MedicineName { get; set; } = "";
        public int Quantity { get; set; }
        public string? Dosage { get; set; }
        public string? Instructions { get; set; }
    }
}
