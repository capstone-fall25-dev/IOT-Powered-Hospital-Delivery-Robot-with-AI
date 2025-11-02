using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("medicines")]
[Index("CategoryId", Name = "fk_medicine_category")]
[Index("MedicineCode", Name = "medicine_code", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Medicine
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("medicine_code")]
    [StringLength(64)]
    public string MedicineCode { get; set; } = null!;

    [Column("name")]
    [StringLength(255)]
    public string Name { get; set; } = null!;

    [Column("unit")]
    [StringLength(64)]
    public string? Unit { get; set; }

    [Column("stock_quantity")]
    public int? StockQuantity { get; set; }

    [Column("description")]
    [StringLength(255)]
    public string? Description { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [Column("category_id")]
    public ulong? CategoryId { get; set; }

    [Column("expiry_date", TypeName = "datetime")]
    public DateTime? ExpiryDate { get; set; }

    [Column("status", TypeName = "enum('active','expired')")]
    [EnumDataType(typeof(MedicineStatus))]
    public MedicineStatus Status { get; set; } = MedicineStatus.Active;

    [ForeignKey("CategoryId")]
    [InverseProperty("Medicines")]
    public virtual DrugCategory? Category { get; set; }

    [InverseProperty("Medicine")]
    public virtual ICollection<PrescriptionItem> PrescriptionItems { get; set; } = new List<PrescriptionItem>();
}
