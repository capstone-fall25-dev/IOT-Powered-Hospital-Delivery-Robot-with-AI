using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("tasks")]
[Index("MapId", Name = "fk_task_map")]
[Index("AssignedBy", Name = "fk_tasks_assigned_by")]
[Index("RobotId", Name = "idx_task_robot")]
[Index("Status", Name = "idx_task_status")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Task
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("robot_id")]
    public ulong RobotId { get; set; }

    [Column("assigned_by")]
    public ulong? AssignedBy { get; set; }

    [Column("status", TypeName = "enum('pending','in_progress','awaiting_handover','returning','at_station','completed','canceled')")]
    public string Status { get; set; } = null!;

    [Column("started_at", TypeName = "datetime")]
    public DateTime? StartedAt { get; set; }

    [Column("completed_at", TypeName = "datetime")]
    public DateTime? CompletedAt { get; set; }

    [Column("total_duration_s")]
    public int? TotalDurationS { get; set; }

    [Column("total_errors")]
    public int TotalErrors { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [Column("map_id")]
    public ulong? MapId { get; set; }

    [Column("priority", TypeName = "enum('Normal','Urgent','Critical')")]
    public string Priority { get; set; } = null!;

    [Column("scheduled_start_at", TypeName = "datetime")]
    public DateTime? ScheduledStartAt { get; set; }

    [ForeignKey("AssignedBy")]
    [InverseProperty("Tasks")]
    public virtual User? AssignedByNavigation { get; set; }

    [InverseProperty("Task")]
    public virtual ICollection<CompartmentAssignment> CompartmentAssignments { get; set; } = new List<CompartmentAssignment>();

    [InverseProperty("Task")]
    public virtual ICollection<Log> Logs { get; set; } = new List<Log>();

    [ForeignKey("MapId")]
    [InverseProperty("Tasks")]
    public virtual Map? Map { get; set; }

    [ForeignKey("RobotId")]
    [InverseProperty("Tasks")]
    public virtual Robot Robot { get; set; } = null!;

    [InverseProperty("Task")]
    public virtual ICollection<TaskPatientAssignment> TaskPatientAssignments { get; set; } = new List<TaskPatientAssignment>();

    [InverseProperty("Task")]
    public virtual ICollection<TaskStop> TaskStops { get; set; } = new List<TaskStop>();
}
