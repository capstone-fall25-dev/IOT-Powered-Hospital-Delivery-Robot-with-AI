using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("task_stops")]
[Index("DestinationId", Name = "fk_stop_destination")]
[Index("EtaAt", Name = "idx_stop_eta")]
[Index("Status", Name = "idx_stop_status")]
[Index("TaskId", "SeqNo", Name = "uk_task_seq", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class TaskStop
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("task_id")]
    public ulong TaskId { get; set; }

    [Column("seq_no")]
    public int SeqNo { get; set; }

    [Column("destination_id")]
    public ulong? DestinationId { get; set; }

    [Column("custom_name")]
    [StringLength(255)]
    public string? CustomName { get; set; }

    [Column("status", TypeName = "enum('pending','in_progress','awaiting_handover','delivered','skipped','failed')")]
    public string Status { get; set; } = null!;

    [Column("eta_at", TypeName = "datetime")]
    public DateTime? EtaAt { get; set; }

    [Column("arrived_at", TypeName = "datetime")]
    public DateTime? ArrivedAt { get; set; }

    [Column("handed_over_at", TypeName = "datetime")]
    public DateTime? HandedOverAt { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [InverseProperty("Stop")]
    public virtual ICollection<CompartmentAssignment> CompartmentAssignments { get; set; } = new List<CompartmentAssignment>();

    [ForeignKey("DestinationId")]
    [InverseProperty("TaskStops")]
    public virtual Destination? Destination { get; set; }

    [InverseProperty("Stop")]
    public virtual ICollection<Log> Logs { get; set; } = new List<Log>();

    [ForeignKey("TaskId")]
    [InverseProperty("TaskStops")]
    public virtual Task Task { get; set; } = null!;
}
