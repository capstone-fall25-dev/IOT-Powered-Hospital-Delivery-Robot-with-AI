using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("performance_history")]
[Index("CompletionDate", Name = "idx_perf_date")]
[Index("RobotId", "CompletionDate", Name = "idx_perf_robot_date")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class PerformanceHistory
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("robot_id")]
    public ulong RobotId { get; set; }

    [Column("destinations", TypeName = "text")]
    public string Destinations { get; set; } = null!;

    [Column("completion_date", TypeName = "datetime")]
    public DateTime CompletionDate { get; set; }

    [Column("duration_seconds")]
    public int DurationSeconds { get; set; }

    [Column("error_count")]
    public int ErrorCount { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("RobotId")]
    [InverseProperty("PerformanceHistories")]
    public virtual Robot Robot { get; set; } = null!;
}
