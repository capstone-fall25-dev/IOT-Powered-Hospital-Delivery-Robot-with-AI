using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Prescription
{
    public ulong Id { get; set; }

    public string PrescriptionCode { get; set; } = null!;

    public ulong PatientId { get; set; }

    public ulong? UsersId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public string? Status { get; set; }

    public virtual Patient Patient { get; set; } = null!;

    public virtual ICollection<PrescriptionItem> PrescriptionItems { get; set; } = new List<PrescriptionItem>();

    public virtual User? Users { get; set; }
}
