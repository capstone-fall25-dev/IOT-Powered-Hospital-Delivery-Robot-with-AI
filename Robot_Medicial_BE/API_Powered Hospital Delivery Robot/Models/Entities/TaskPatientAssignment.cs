using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class TaskPatientAssignment
{
    public ulong Id { get; set; }

    public ulong TaskId { get; set; }

    public ulong PatientId { get; set; }

    public virtual Patient Patient { get; set; } = null!;

    public virtual Task Task { get; set; } = null!;
}
