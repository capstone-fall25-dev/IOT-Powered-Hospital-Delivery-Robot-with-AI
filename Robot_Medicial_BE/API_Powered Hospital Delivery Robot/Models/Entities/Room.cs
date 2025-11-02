using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Room
{
    public ulong Id { get; set; }

    public string RoomName { get; set; } = null!;

    public decimal? Longitude { get; set; }

    public decimal? Latitude { get; set; }

    public ulong? MapId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Map? Map { get; set; }

    public virtual ICollection<Patient> Patients { get; set; } = new List<Patient>();
}
