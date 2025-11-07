using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("patients")]
[Index("RoomId", Name = "fk_patients_rooms")]
[Index("PatientCode", Name = "patient_code", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class Patient
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("patient_code")]
    [StringLength(64)]
    public string PatientCode { get; set; } = null!;

    [Column("full_name")]
    [StringLength(128)]
    public string FullName { get; set; } = null!;

    [Column("gender", TypeName = "enum('male','female','other')")]
    public string? Gender { get; set; }

    [Column("dob")]
    public DateOnly? Dob { get; set; }

    [Column("address")]
    [StringLength(255)]
    public string? Address { get; set; }

    [Column("phone")]
    [StringLength(20)]
    public string? Phone { get; set; }

    [Column("department")]
    [StringLength(128)]
    public string? Department { get; set; }

    [Column("room_number")]
    [StringLength(64)]
    public string? RoomNumber { get; set; }

    [Column("room_id")]
    public ulong? RoomId { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime? CreatedAt { get; set; }

    [Column("status", TypeName = "enum('active','discharged')")]
    public string Status { get; set; } = null!;

    [InverseProperty("Patient")]
    public virtual ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();

    [InverseProperty("Patient")]
    public virtual ICollection<RobotCompartment> RobotCompartments { get; set; } = new List<RobotCompartment>();

    [ForeignKey("RoomId")]
    [InverseProperty("Patients")]
    public virtual Room? Room { get; set; }

    [InverseProperty("Patient")]
    public virtual ICollection<TaskPatientAssignment> TaskPatientAssignments { get; set; } = new List<TaskPatientAssignment>();
}
