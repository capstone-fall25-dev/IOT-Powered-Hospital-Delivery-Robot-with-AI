using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Robot
{
    public ulong Id { get; set; }

    public string Code { get; set; } = null!;

    public string? Name { get; set; }

    public string Status { get; set; } = null!;

    public decimal BatteryPercent { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public decimal ProgressOverallPct { get; set; }

    public decimal ProgressLegPct { get; set; }

    public bool IsMicOn { get; set; }

    public DateTime? EtaDeliveryAt { get; set; }

    public DateTime? EtaReturnAt { get; set; }

    public int ErrorCountSession { get; set; }

    public DateTime? LastHeartbeatAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }

    public ulong? MapId { get; set; }

    public virtual ICollection<Alert> Alerts { get; set; } = new List<Alert>();

    public virtual ICollection<Log> Logs { get; set; } = new List<Log>();

    public virtual Map? Map { get; set; }

    public virtual ICollection<PerformanceHistory> PerformanceHistories { get; set; } = new List<PerformanceHistory>();

    public virtual ICollection<RobotCompartment> RobotCompartments { get; set; } = new List<RobotCompartment>();

    public virtual ICollection<RobotMaintenanceLog> RobotMaintenanceLogs { get; set; } = new List<RobotMaintenanceLog>();

    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
}
