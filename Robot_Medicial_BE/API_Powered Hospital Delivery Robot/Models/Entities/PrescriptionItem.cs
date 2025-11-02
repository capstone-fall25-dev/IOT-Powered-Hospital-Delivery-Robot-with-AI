using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class PrescriptionItem
{
    public ulong Id { get; set; }

    public ulong PrescriptionId { get; set; }

    public ulong MedicineId { get; set; }

    public int Quantity { get; set; }

    public string? Dosage { get; set; }

    public string? Instructions { get; set; }

    public virtual ICollection<Alert> Alerts { get; set; } = new List<Alert>();

    public virtual Medicine Medicine { get; set; } = null!;

    public virtual Prescription Prescription { get; set; } = null!;
}
