using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Map
{
    public ulong Id { get; set; }

    public string MapName { get; set; } = null!;

    public string? ImageName { get; set; }

    public int? Width { get; set; }

    public int? Height { get; set; }

    public float? Resolution { get; set; }

    public float? OriginX { get; set; }

    public float? OriginY { get; set; }

    public float? OriginZ { get; set; }

    public string? Mode { get; set; }

    public sbyte? Negate { get; set; }

    public float? OccupiedThresh { get; set; }

    public float? FreeThresh { get; set; }

    public byte[]? ImageData { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual ICollection<Robot> Robots { get; set; } = new List<Robot>();

    public virtual ICollection<Room> Rooms { get; set; } = new List<Room>();

    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
}
