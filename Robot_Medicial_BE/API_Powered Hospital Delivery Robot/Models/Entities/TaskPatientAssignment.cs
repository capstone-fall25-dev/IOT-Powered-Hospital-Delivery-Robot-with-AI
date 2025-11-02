using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("task_patient_assignments")]
[Index("PatientId", Name = "fk_tpa_patient")]
[Index("TaskId", Name = "fk_tpa_task")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class TaskPatientAssignment
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("task_id")]
    public ulong TaskId { get; set; }

    [Column("patient_id")]
    public ulong PatientId { get; set; }

    [ForeignKey("PatientId")]
    [InverseProperty("TaskPatientAssignments")]
    public virtual Patient Patient { get; set; } = null!;

    [ForeignKey("TaskId")]
    [InverseProperty("TaskPatientAssignments")]
    public virtual Task Task { get; set; } = null!;
}
