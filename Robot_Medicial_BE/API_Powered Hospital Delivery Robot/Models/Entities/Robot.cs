using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("robots")]
[Index("Code", Name = "code", IsUnique = true)]
[Index("MapId", Name = "fk_robot_map")]
[Index("EtaDeliveryAt", Name = "idx_robot_eta_delivery")]
[Index("EtaReturnAt", Name = "idx_robot_eta_return")]
[Index("Status", Name = "idx_robot_status")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Robot
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("code")]
    [StringLength(32)]
    public string Code { get; set; } = null!;

    [Column("name")]
    [StringLength(128)]
    public string? Name { get; set; }

    [Column("status", TypeName = "enum('transporting','awaiting_handover','returning_to_station','at_station','completed','charging','needs_attention','manual_control','offline')")]
    public string Status { get; set; } = null!;

    [Column("battery_percent")]
    [Precision(5, 2)]
    public decimal BatteryPercent { get; set; }

    [Column("latitude")]
    [Precision(10, 6)]
    public decimal? Latitude { get; set; }

    [Column("longitude")]
    [Precision(10, 6)]
    public decimal? Longitude { get; set; }

    [Column("progress_overall_pct")]
    [Precision(5, 2)]
    public decimal ProgressOverallPct { get; set; }

    [Column("progress_leg_pct")]
    [Precision(5, 2)]
    public decimal ProgressLegPct { get; set; }

    [Column("is_mic_on")]
    public bool IsMicOn { get; set; }

    [Column("eta_delivery_at", TypeName = "datetime")]
    public DateTime? EtaDeliveryAt { get; set; }

    [Column("eta_return_at", TypeName = "datetime")]
    public DateTime? EtaReturnAt { get; set; }

    [Column("error_count_session")]
    public int ErrorCountSession { get; set; }

    [Column("last_heartbeat_at", TypeName = "datetime")]
    public DateTime? LastHeartbeatAt { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [Column("map_id")]
    public ulong? MapId { get; set; }

    [InverseProperty("Robot")]
    public virtual ICollection<Alert> Alerts { get; set; } = new List<Alert>();

    [InverseProperty("Robot")]
    public virtual ICollection<Log> Logs { get; set; } = new List<Log>();

    [ForeignKey("MapId")]
    [InverseProperty("Robots")]
    public virtual Map? Map { get; set; }

    [InverseProperty("Robot")]
    public virtual ICollection<PerformanceHistory> PerformanceHistories { get; set; } = new List<PerformanceHistory>();

    [InverseProperty("Robot")]
    public virtual ICollection<RobotCompartment> RobotCompartments { get; set; } = new List<RobotCompartment>();

    [InverseProperty("Robot")]
    public virtual ICollection<RobotMaintenanceLog> RobotMaintenanceLogs { get; set; } = new List<RobotMaintenanceLog>();

    [InverseProperty("Robot")]
    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
}
