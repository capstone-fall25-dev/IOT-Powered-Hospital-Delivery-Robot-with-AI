using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class TaskPriorityDto
    {
        [Required]
        public string Priority { get; set; } = "Normal"; // enum: 'Normal','Urgent','Critical'
    }

    public enum TaskPriority
    {
        Normal, Urgent, Critical
    }

    public class TaskDto
    {
        public ulong Id { get; set; }

        [Required]
        public ulong RobotId { get; set; }

        public ulong? AssignedBy { get; set; } // User ID

        [Required]
        public string Status { get; set; } = "pending"; // enum values
        public TaskPriority Priority { get; set; } = TaskPriority.Normal;
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
        public TaskPriority Priority { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int? TotalDurationS { get; set; }
        public int TotalErrors { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public DateTime ScheduledStartAt { get; set; }
        public List<TaskStopDto> Stops { get; set; } = new List<TaskStopDto>();
        public List<CompartmentAssignmentDto> SuggestedCompartments { get; set; } = new List<CompartmentAssignmentDto>();
    }

    public class TaskReportDto
    {
        public string RobotCode { get; set; } = null!;
        public int TotalTasks { get; set; }
        public double AvgDurationSeconds { get; set; }
        public int TotalErrors { get; set; }
        public DateTime PeriodStart { get; set; }
        public DateTime PeriodEnd { get; set; }
    }
}
