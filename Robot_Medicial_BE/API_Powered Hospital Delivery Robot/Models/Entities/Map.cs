using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("maps")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Map
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("map_name")]
    [StringLength(255)]
    public string MapName { get; set; } = null!;

    [Column("image_name")]
    [StringLength(255)]
    public string? ImageName { get; set; }

    [Column("width")]
    public int? Width { get; set; }

    [Column("height")]
    public int? Height { get; set; }

    [Column("resolution")]
    public float? Resolution { get; set; }

    [Column("origin_x")]
    public float? OriginX { get; set; }

    [Column("origin_y")]
    public float? OriginY { get; set; }

    [Column("origin_z")]
    public float? OriginZ { get; set; }

    [Column("mode")]
    [StringLength(50)]
    public string? Mode { get; set; }

    [Column("negate")]
    public sbyte? Negate { get; set; }

    [Column("occupied_thresh")]
    public float? OccupiedThresh { get; set; }

    [Column("free_thresh")]
    public float? FreeThresh { get; set; }

    [Column("image_data")]
    public byte[]? ImageData { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [InverseProperty("Map")]
    public virtual ICollection<Robot> Robots { get; set; } = new List<Robot>();

    [InverseProperty("Map")]
    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();

    [InverseProperty("Map")]
    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
}
