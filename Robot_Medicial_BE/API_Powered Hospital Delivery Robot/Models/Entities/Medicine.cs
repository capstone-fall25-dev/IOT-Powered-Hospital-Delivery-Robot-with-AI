using System;
using System.Collections.Generic;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class Medicine
{
    public ulong Id { get; set; }

    public string MedicineCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string? Unit { get; set; }

    public decimal? Price { get; set; }

    public int? StockQuantity { get; set; }

    public string? Description { get; set; }

    public DateTime? CreatedAt { get; set; }

    public ulong? CategoryId { get; set; }

    public DateTime? ExpiryDate { get; set; }

    public string Status { get; set; } = null!;

    public virtual DrugCategory? Category { get; set; }

    public virtual ICollection<PrescriptionItem> PrescriptionItems { get; set; } = new List<PrescriptionItem>();
}
