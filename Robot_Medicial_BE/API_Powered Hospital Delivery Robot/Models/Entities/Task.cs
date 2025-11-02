using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Task
{
    public ulong Id { get; set; }

    public ulong RobotId { get; set; }

    public ulong? AssignedBy { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public int? TotalDurationS { get; set; }

    public int TotalErrors { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ulong? MapId { get; set; }

    public string Priority { get; set; } = null!;

    public virtual User? AssignedByNavigation { get; set; }

    public virtual ICollection<CompartmentAssignment> CompartmentAssignments { get; set; } = new List<CompartmentAssignment>();

    public virtual ICollection<Log> Logs { get; set; } = new List<Log>();

    public virtual Map? Map { get; set; }

    public virtual Robot Robot { get; set; } = null!;

    public virtual ICollection<TaskPatientAssignment> TaskPatientAssignments { get; set; } = new List<TaskPatientAssignment>();

    public virtual ICollection<TaskStop> TaskStops { get; set; } = new List<TaskStop>();
}
