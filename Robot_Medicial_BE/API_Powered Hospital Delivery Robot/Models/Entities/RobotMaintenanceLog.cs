using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class RobotMaintenanceLog
{
    public ulong Id { get; set; }

    public ulong RobotId { get; set; }

    public DateTime? MaintenanceDate { get; set; }

    public string? Details { get; set; }

    public virtual Robot Robot { get; set; } = null!;
}
