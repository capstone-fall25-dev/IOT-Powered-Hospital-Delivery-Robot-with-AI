using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class RobotCompartment
{
    public ulong Id { get; set; }

    public ulong RobotId { get; set; }

    public string CompartmentCode { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string? ContentLabel { get; set; }

    public bool? IsActive { get; set; }

    public ulong? PatientId { get; set; }

    public ulong? CategoryId { get; set; }

    public virtual CompartmentCategory? Category { get; set; }

    public virtual ICollection<CompartmentAssignment> CompartmentAssignments { get; set; } = new List<CompartmentAssignment>();

    public virtual Patient? Patient { get; set; }

    public virtual Robot Robot { get; set; } = null!;
}
