using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class TaskDto
    {
        public ulong Id { get; set; }

        [Required]
        public ulong RobotId { get; set; }
        public ulong? AssignedBy { get; set; }
        public string Status { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? TotalDurationS { get; set; }
        public int TotalErrors { get; set; } = 0;
    }

    public class TaskResponseDto
    {
        public ulong Id { get; set; }
        public ulong RobotId { get; set; }
        public string? RobotName { get; set; }
        public ulong? AssignedBy { get; set; }
        public string? AssignedByUsername { get; set; }
        public string Status { get; set; } = null!;
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? TotalDurationS { get; set; }
        public int TotalErrors { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
