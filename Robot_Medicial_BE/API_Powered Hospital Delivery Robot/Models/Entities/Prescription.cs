using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("prescriptions")]
[Index("PatientId", Name = "fk_presc_patient")]
[Index("UsersId", Name = "fk_presc_users")]
[Index("PrescriptionCode", Name = "prescription_code", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Prescription
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("prescription_code")]
    [StringLength(64)]
    public string PrescriptionCode { get; set; } = null!;

    [Column("patient_id")]
    public ulong PatientId { get; set; }

    [Column("users_id")]
    public ulong? UsersId { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [Column("status", TypeName = "enum('pending','approved','dispensed','canceled')")]
    public string? Status { get; set; }

    [ForeignKey("PatientId")]
    [InverseProperty("Prescriptions")]
    public virtual Patient Patient { get; set; } = null!;

    [InverseProperty("Prescription")]
    public virtual ICollection<PrescriptionItem> PrescriptionItems { get; set; } = new List<PrescriptionItem>();

    [ForeignKey("UsersId")]
    [InverseProperty("Prescriptions")]
    public virtual User? Users { get; set; }
}
