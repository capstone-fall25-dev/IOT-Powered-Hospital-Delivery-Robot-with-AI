// Models/Entities/TaskHistory.cs
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("task_histories")]
[Index(nameof(TaskId))]
[Index(nameof(RobotId))]
[Index(nameof(CompletedAt))]
[Index(nameof(FinalStatus))]
public class TaskHistory
{
    [Key]
    public ulong Id { get; set; }

    public ulong TaskId { get; set; }

    public ulong RobotId { get; set; }
    public string RobotCode { get; set; } = null!;
    public string? RobotName { get; set; }

    public ulong? AssignedBy { get; set; }
    public string AssignedByName { get; set; } = null!;
    public string AssignedByEmail { get; set; } = null!;

    public ulong? MapId { get; set; }
    public string? MapName { get; set; }

    public string Priority { get; set; } = null!;
    public string FinalStatus { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
    public DateTime? ScheduledStartAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? TotalDurationS { get; set; }
    public int TotalErrors { get; set; }

    public int TotalStops { get; set; }
    public int DeliveredStops { get; set; }
    public int SkippedStops { get; set; }
    public int FailedStops { get; set; }

    public DateTime RecordedAt { get; set; }

    // Navigation
    public virtual ICollection<TaskStopHistory> StopHistories { get; set; } = new List<TaskStopHistory>();
}