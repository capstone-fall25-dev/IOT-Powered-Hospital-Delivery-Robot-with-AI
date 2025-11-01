using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Patient
{
    public ulong Id { get; set; }

    public string PatientCode { get; set; } = null!;

    public string FullName { get; set; } = null!;

    public string? Gender { get; set; }

    public DateOnly? Dob { get; set; }

    public string? Address { get; set; }

    public string? Phone { get; set; }

    public string? Department { get; set; }

    public string? RoomNumber { get; set; }

    public ulong? RoomId { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();

    public virtual ICollection<RobotCompartment> RobotCompartments { get; set; } = new List<RobotCompartment>();

    public virtual Room? Room { get; set; }

    public virtual ICollection<TaskPatientAssignment> TaskPatientAssignments { get; set; } = new List<TaskPatientAssignment>();
}
