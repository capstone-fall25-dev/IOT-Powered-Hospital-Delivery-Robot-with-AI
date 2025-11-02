using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Log
{
    public ulong Id { get; set; }

    public ulong RobotId { get; set; }

    public ulong? TaskId { get; set; }

    public ulong? StopId { get; set; }

    public string LogType { get; set; } = null!;

    public string Message { get; set; } = null!;

    public DateTime CreatedAt { get; set; }

    public virtual Robot Robot { get; set; } = null!;

    public virtual TaskStop? Stop { get; set; }

    public virtual Task? Task { get; set; }
}
