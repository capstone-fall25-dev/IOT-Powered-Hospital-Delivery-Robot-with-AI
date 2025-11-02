using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("compartment_assignments")]
[Index("CompartmentId", Name = "fk_ca_comp")]
[Index("TaskId", Name = "fk_ca_task")]
[Index("Status", Name = "idx_ca_status")]
[Index("StopId", "CompartmentId", Name = "uk_stop_comp", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class CompartmentAssignment
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("task_id")]
    public ulong TaskId { get; set; }

    [Column("stop_id")]
    public ulong StopId { get; set; }

    [Column("compartment_id")]
    public ulong CompartmentId { get; set; }

    [Column("item_desc")]
    [StringLength(255)]
    public string ItemDesc { get; set; } = null!;

    [Column("status", TypeName = "enum('pending','loaded','unlocked','delivered','locked','canceled')")]
    public string Status { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey("CompartmentId")]
    [InverseProperty("CompartmentAssignments")]
    public virtual RobotCompartment Compartment { get; set; } = null!;

    [ForeignKey("StopId")]
    [InverseProperty("CompartmentAssignments")]
    public virtual TaskStop Stop { get; set; } = null!;

    [ForeignKey("TaskId")]
    [InverseProperty("CompartmentAssignments")]
    public virtual Task Task { get; set; } = null!;
}
