using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Destination
{
    public ulong Id { get; set; }

    public string Name { get; set; } = null!;

    public string? Area { get; set; }

    public string? Floor { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<TaskStop> TaskStops { get; set; } = new List<TaskStop>();
}
