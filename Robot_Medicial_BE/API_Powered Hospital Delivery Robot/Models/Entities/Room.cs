using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("rooms")]
[Index("MapId", Name = "idx_map_id")]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Room
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("room_name")]
    [StringLength(128)]
    public string RoomName { get; set; } = null!;

    [Column("longitude")]
    [Precision(10, 7)]
    public decimal? Longitude { get; set; }

    [Column("latitude")]
    [Precision(10, 7)]
    public decimal? Latitude { get; set; }

    [Column("map_id")]
    public ulong? MapId { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [ForeignKey("MapId")]
    [InverseProperty("Rooms")]
    public virtual Map? Map { get; set; }

    [InverseProperty("Room")]
    public virtual ICollection<Patient> Patients { get; set; } = new List<Patient>();
}
