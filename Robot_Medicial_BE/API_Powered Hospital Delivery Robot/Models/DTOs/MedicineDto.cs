using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public enum MedicineStatus
    {
        Active, Expired
    }

    public class MedicineDto
    {
        [Required]
        [StringLength(64)]
        public string MedicineCode { get; set; } = null!; // Unique

        [Required]
        [StringLength(255)]
        public string Name { get; set; } = null!;

        [StringLength(64)]
        public string? Unit { get; set; }

        [Range(0, int.MaxValue)]
        public int StockQuantity { get; set; } = 0;

        [StringLength(255)]
        public string? Description { get; set; }

        public ulong? CategoryId { get; set; }

        public DateTime? ExpiryDate { get; set; } 

        public MedicineStatus Status { get; set; } = MedicineStatus.Active;
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
        public string? CategoryName { get; set; } // Từ relation
        public DateTime? ExpiryDate { get; set; }
        public MedicineStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    // DTO cho scan
    public class ScanExpiredDto
    {
        public bool FlagOnly { get; set; } = true; // Flag or hard-delete
    }

    public class ScanExpiredResponseDto
    {
        public int TotalScanned { get; set; }
        public int ExpiredCount { get; set; }
        public List<string> ExpiredCodes { get; set; } = new List<string>();
    }

    public class MedicineStockReportDto
    {
        public string MedicineName { get; set; } = null!;
        public int CurrentStock { get; set; }
        public int LowStockThreshold { get; set; } = 10; // Configurable
        public bool IsShortage { get; set; }
        public int DispensedLastMonth { get; set; } // Sum from prescription items
    }
}
