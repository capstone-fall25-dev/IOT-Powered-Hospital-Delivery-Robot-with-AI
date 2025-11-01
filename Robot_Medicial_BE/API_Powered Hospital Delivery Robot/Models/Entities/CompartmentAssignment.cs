using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class CompartmentAssignment
{
    public ulong Id { get; set; }

    public ulong TaskId { get; set; }

    public ulong StopId { get; set; }

    public ulong CompartmentId { get; set; }

    public string ItemDesc { get; set; } = null!;

    public string Status { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public virtual RobotCompartment Compartment { get; set; } = null!;

    public virtual TaskStop Stop { get; set; } = null!;

    public virtual Task Task { get; set; } = null!;
}
