using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("destinations")]
[Index("Name", Name = "name", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Destination
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = null!;

    [Column("area")]
    [StringLength(255)]
    public string? Area { get; set; }

    [Column("floor")]
    [StringLength(64)]
    public string? Floor { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [InverseProperty("Destination")]
    public virtual ICollection<TaskStop> TaskStops { get; set; } = new List<TaskStop>();
}
