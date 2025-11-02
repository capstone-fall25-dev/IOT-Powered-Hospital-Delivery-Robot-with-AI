using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class TaskStopDto
    {
        public ulong Id { get; set; }

        public int SeqNo { get; set; } 

        public ulong? DestinationId { get; set; }

        [StringLength(255)]
        public string? CustomName { get; set; } 

        public string Status { get; set; } = "pending";

        public DateTime? EtaAt { get; set; }
        public DateTime? ArrivedAt { get; set; }
        public DateTime? HandedOverAt { get; set; }
    }

    // Mở rộng TaskDto để include List<TaskStopDto> cho Create
    public class CreateTaskDto : TaskDto  // Kế thừa từ TaskDto
    {
        public List<TaskStopDto> TaskStops { get; set; } = new List<TaskStopDto>();
    }
}
