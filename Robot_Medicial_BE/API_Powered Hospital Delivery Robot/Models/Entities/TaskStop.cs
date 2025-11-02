using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class TaskStop
{
    public ulong Id { get; set; }

    public ulong TaskId { get; set; }

    public int SeqNo { get; set; }

    public ulong? DestinationId { get; set; }

    public string? CustomName { get; set; }

    public string Status { get; set; } = null!;

    public DateTime? EtaAt { get; set; }

    public DateTime? ArrivedAt { get; set; }

    public DateTime? HandedOverAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual ICollection<CompartmentAssignment> CompartmentAssignments { get; set; } = new List<CompartmentAssignment>();

    public virtual Destination? Destination { get; set; }

    public virtual ICollection<Log> Logs { get; set; } = new List<Log>();

    public virtual Task Task { get; set; } = null!;
}
