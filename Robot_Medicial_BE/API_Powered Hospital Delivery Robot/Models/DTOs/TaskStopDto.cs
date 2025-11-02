using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class TaskStopDto
    {
        public ulong Id { get; set; } // Auto-gen khi tạo

        public int SeqNo { get; set; } // Thứ tự stop (e.g., 1=start, 2=end)

        public ulong? DestinationId { get; set; } 

        [StringLength(255)]
        public string? CustomName { get; set; } 

        public string Status { get; set; } = "pending"; 

        public DateTime? EtaAt { get; set; }
        public DateTime? ArrivedAt { get; set; }
        public DateTime? HandedOverAt { get; set; }
    }

    public class UpdateProgressDto
    {
        public int SeqNo { get; set; }
        public string StopStatus { get; set; } = null!;
        public int? DurationS { get; set; }
    }

    public class SubmitTaskDto
    {
        [StringLength(500)]
        public string? Message { get; set; }
    }
}
