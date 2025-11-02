using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities
{
    [Table("alerts")]
    [Index("RobotId", Name = "fk_alert_robot")]
    [Index("Category", Name = "idx_alert_category")]
    [Index("CreatedAt", Name = "idx_alert_created")]
    [Index("Status", Name = "idx_alert_status")]
    [MySqlCollation("utf8mb4_unicode_ci")]
    public partial class Alert
    {
        [Key]
        [Column("id")]
        public ulong Id { get; set; }

        [Column("robot_id")]
        public ulong RobotId { get; set; }

        [Column("severity", TypeName = "enum('low','medium','high','critical')")]
        public string Severity { get; set; } = null!;

        [Column("category", TypeName = "enum('battery','network','obstacle','system','manual')")]
        public string Category { get; set; } = null!;

        [Column("status", TypeName = "enum('open','acknowledged','resolved')")]
        public string Status { get; set; } = null!;

        [Column("message")]
        [StringLength(500)]
        public string Message { get; set; } = null!;

        [Column("created_at", TypeName = "datetime")]
        public DateTime CreatedAt { get; set; }

        [Column("resolved_at", TypeName = "datetime")]
        public DateTime? ResolvedAt { get; set; }

        [Column("prescription_item_id")] 
        public ulong? PrescriptionItemId { get; set; }

        [ForeignKey("RobotId")]
        [InverseProperty("Alerts")]
        public virtual Robot Robot { get; set; } = null!;

        [ForeignKey("PrescriptionItemId")]
        [InverseProperty("Alerts")]
        public virtual PrescriptionItem? PrescriptionItem { get; set; } = null!; 
    }
}