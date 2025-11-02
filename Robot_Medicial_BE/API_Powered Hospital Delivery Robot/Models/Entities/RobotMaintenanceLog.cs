using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("robot_maintenance_logs")]
[Index("RobotId", Name = "fk_rm_robot2")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class RobotMaintenanceLog
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("robot_id")]
    public ulong RobotId { get; set; }

    [Column("maintenance_date", TypeName = "datetime")]
    public DateTime? MaintenanceDate { get; set; }

    [Column("details", TypeName = "text")]
    public string? Details { get; set; }

    [ForeignKey("RobotId")]
    [InverseProperty("RobotMaintenanceLogs")]
    public virtual Robot Robot { get; set; } = null!;
}
