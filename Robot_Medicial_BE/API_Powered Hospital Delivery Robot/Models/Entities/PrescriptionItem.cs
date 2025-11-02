using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("prescription_items")]
[Index("MedicineId", Name = "fk_pi_medicine")]
[Index("PrescriptionId", Name = "fk_pi_prescription")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class PrescriptionItem
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("prescription_id")]
    public ulong PrescriptionId { get; set; }

    [Column("medicine_id")]
    public ulong MedicineId { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("dosage")]
    [StringLength(128)]
    public string? Dosage { get; set; }

    [Column("instructions")]
    [StringLength(255)]
    public string? Instructions { get; set; }

    [ForeignKey("MedicineId")]
    [InverseProperty("PrescriptionItems")]
    public virtual Medicine Medicine { get; set; } = null!;

    [ForeignKey("PrescriptionId")]
    [InverseProperty("PrescriptionItems")]
    public virtual Prescription Prescription { get; set; } = null!;

    [InverseProperty("PrescriptionItem")]
    public virtual ICollection<Alert> Alerts { get; set; } = new List<Alert>();
}
