using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class PerformanceHistory
{
    public ulong Id { get; set; }

    public ulong RobotId { get; set; }

    public string Destinations { get; set; } = null!;

    public DateTime CompletionDate { get; set; }

    public int DurationSeconds { get; set; }

    public int ErrorCount { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Robot Robot { get; set; } = null!;
}
