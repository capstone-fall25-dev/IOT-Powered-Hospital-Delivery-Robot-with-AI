using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

[Table("drug_categories")]
[Index("Name", Name = "name", IsUnique = true)]
[MySqlCollation("utf8mb4_unicode_ci")]
public partial class DrugCategory
{
    [Key]
    [Column("id")]
    public ulong Id { get; set; }

    [Column("name")]
    [StringLength(128)]
    public string Name { get; set; } = null!;

    [InverseProperty("Category")]
    public virtual ICollection<Medicine> Medicines { get; set; } = new List<Medicine>();
}
