// Models/Entities/TaskStopHistory.cs
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("task_stop_histories")]
[Index(nameof(TaskHistoryId))]
[Index(nameof(SeqNo))]
public class TaskStopHistory
{
    [Key]
    public ulong Id { get; set; }

    public ulong TaskHistoryId { get; set; }

    public int SeqNo { get; set; }

    public ulong? DestinationId { get; set; }
    public string DestinationName { get; set; } = null!;

    public ulong? PatientId { get; set; }
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; }
    public string? RoomNumber { get; set; }

    public ulong? CompartmentId { get; set; }
    public string? CompartmentCode { get; set; }

    [Column("prescription_code")]
    public string? CustomName { get; set; } // Mã đơn thuốc (map sang column prescription_code trong DB)
    public string? ItemDesc { get; set; }

    public string Status { get; set; } = null!;
    public DateTime? ArrivedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public int? DurationSeconds { get; set; }
}