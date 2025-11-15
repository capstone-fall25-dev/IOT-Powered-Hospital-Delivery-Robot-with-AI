using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    // CATEGORY ============================
    public class CategoryCreateDto
    {
        [Required]
        [StringLength(128)]
        public string Name { get; set; } = null!;
    }

    public class CategoryUpdateDto
    {
        [StringLength(128)]
        public string? Name { get; set; }
    }

    public class CategoryResponseDto
    {
        public ulong Id { get; set; }
        public string Name { get; set; } = null!;
    }

    // MEDICINE ===============================
    public enum MedicineStatus
    {
        Active, Expired
    }

    public class MedicineCreateDto
    {
        [Required]
        [StringLength(64)]
        public string MedicineCode { get; set; } = null!;

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        public string? Unit { get; set; }

        public int StockQuantity { get; set; }

        public string? Description { get; set; }

        public ulong? CategoryId { get; set; }

        public DateTime? ExpiryDate { get; set; }

        public MedicineStatus Status { get; set; } = MedicineStatus.Active;
    }

    public class MedicineUpdateDto
    {
        public string? MedicineCode { get; set; }
        public string? Name { get; set; }
        public string? Unit { get; set; }
        public int? StockQuantity { get; set; }
        public string? Description { get; set; }
        public ulong? CategoryId { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public MedicineStatus? Status { get; set; }
    }

    public class MedicineResponseDto
    {
        public ulong Id { get; set; }
        public string MedicineCode { get; set; } = null!;
        public string Name { get; set; } = null!;
        public string? Unit { get; set; }
        public int StockQuantity { get; set; }
        public string? Description { get; set; }
        public ulong? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public DateTime? ExpiryDate { get; set; }
        public MedicineStatus Status { get; set; }
        public DateTime? CreatedAt { get; set; }
    }
}
