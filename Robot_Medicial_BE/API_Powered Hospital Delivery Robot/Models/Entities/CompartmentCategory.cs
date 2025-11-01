using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class CompartmentCategory
{
    public ulong Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    public virtual ICollection<RobotCompartment> RobotCompartments { get; set; } = new List<RobotCompartment>();
}
