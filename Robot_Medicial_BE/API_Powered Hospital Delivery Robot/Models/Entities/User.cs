using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("users")]
[Index("Email", Name = "email", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class User
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("email")]
    [StringLength(64)]
    public string Email { get; set; } = null!;

    [Column("password_hash")]
    [StringLength(255)]
    public string PasswordHash { get; set; } = null!;

    [Column("full_name")]
    [StringLength(128)]
    public string? FullName { get; set; }

    [Column("role", TypeName = "enum('admin','operator')")]
    public string Role { get; set; } = null!;

    [Required]
    [Column("is_active")]
    public bool? IsActive { get; set; }

    [Column("created_at", TypeName = "datetime")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at", TypeName = "datetime")]
    public DateTime UpdatedAt { get; set; }

    [InverseProperty("Users")]
    public virtual ICollection<Prescription> Prescriptions { get; set; } = new List<Prescription>();

    [InverseProperty("User")]
    public virtual ICollection<Session> Sessions { get; set; } = new List<Session>();

    [InverseProperty("AssignedByNavigation")]
    public virtual ICollection<Task> Tasks { get; set; } = new List<Task>();
}
