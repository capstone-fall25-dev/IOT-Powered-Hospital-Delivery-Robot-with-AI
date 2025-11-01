using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Alert
{
    public ulong Id { get; set; }

    public ulong RobotId { get; set; }

    public string Severity { get; set; } = null!;

    public string Category { get; set; } = null!;

    public string Status { get; set; } = null!;

    public string Message { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public DateTime? ResolvedAt { get; set; }

    public ulong? PrescriptionItemId { get; set; }

    public virtual PrescriptionItem? PrescriptionItem { get; set; }

    public virtual Robot Robot { get; set; } = null!;
}
