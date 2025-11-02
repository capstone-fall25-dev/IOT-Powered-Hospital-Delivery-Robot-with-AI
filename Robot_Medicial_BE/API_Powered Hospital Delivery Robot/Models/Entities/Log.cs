using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("logs")]
[Index("StopId", Name = "fk_log_stop")]
[Index("TaskId", Name = "fk_log_task")]
[Index("RobotId", "CreatedAt", Name = "idx_logs_robot_time")]
[Index("LogType", Name = "idx_logs_type")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Log
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("robot_id")]
    public ulong RobotId { get; set; }

    [Column("task_id")]
    public ulong? TaskId { get; set; }

    [Column("stop_id")]
    public ulong? StopId { get; set; }

    [Column("log_type", TypeName = "enum('success','warning','error','drive','info','broadcast','mic')")]
    public string LogType { get; set; } = null!;

    [Column("message")]
    [StringLength(500)]
    public string Message { get; set; } = null!;

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [ForeignKey("RobotId")]
    [InverseProperty("Logs")]
    public virtual Robot Robot { get; set; } = null!;

    [ForeignKey("StopId")]
    [InverseProperty("Logs")]
    public virtual TaskStop? Stop { get; set; }

    [ForeignKey("TaskId")]
    [InverseProperty("Logs")]
    public virtual Task? Task { get; set; }
}
