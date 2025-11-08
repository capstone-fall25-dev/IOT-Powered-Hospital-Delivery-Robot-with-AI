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



    public class CreateTaskDto1
    {
        [Required]
        public ulong RobotId { get; set; }

        public ulong? AssignedBy { get; set; } // Sẽ bị override bởi currentUserId

        public ulong? MapId { get; set; }

        public TaskPriority Priority { get; set; } = TaskPriority.Normal;

        public string? Status { get; set; } // Optional, default sẽ là "pending"

        public DateTime? ScheduledStartAt { get; set; }

        [Required]
        [MinLength(1, ErrorMessage = "At least one stop is required")]
        public List<CreateTaskStopDto> TaskStops { get; set; } = new();

        /// <summary>
        /// Optional: User có thể chỉ định compartment assignments
        /// Nếu null hoặc empty, hệ thống sẽ tự động gợi ý
        /// </summary>
        public List<CreateCompartmentAssignmentDto>? CompartmentAssignments { get; set; }

        /// <summary>
        /// Optional: Danh sách patient IDs liên quan
        /// </summary>
        public List<ulong>? PatientIds { get; set; }
    }

    /// <summary>
    /// DTO cho việc tạo task stop
    /// </summary>
    public class CreateTaskStopDto
    {
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "SeqNo must be greater than 0")]
        public int SeqNo { get; set; }

        /// <summary>
        /// ID của destination có sẵn trong hệ thống
        /// Required nếu CustomName null
        /// </summary>
        public ulong? DestinationId { get; set; }

        /// <summary>
        /// Tên tùy chỉnh cho destination
        /// Required nếu DestinationId null
        /// </summary>
        [StringLength(255)]
        public string? CustomName { get; set; }

        public string? Status { get; set; } // Optional, default "pending"

        public DateTime? EtaAt { get; set; }
    }

    /// <summary>
    /// DTO cho việc tạo compartment assignment
    /// </summary>
    public class CreateCompartmentAssignmentDto
    {
        [Required]
        public int StopSeqNo { get; set; } // Seq no của stop

        [Required]
        public ulong CompartmentId { get; set; }

        [Required]
        [StringLength(255)]
        [MinLength(1, ErrorMessage = "ItemDesc is required")]
        public string ItemDesc { get; set; } = string.Empty;

        public string? Status { get; set; } // Optional, default "pending"
    }

    /// <summary>
    /// DTO cho việc filter tasks
    /// </summary>
    public class TaskFilterDto
    {
        public ulong? RobotId { get; set; }

        /// <summary>
        /// 'pending','in_progress','awaiting_handover','returning','at_station','completed','canceled'
        /// </summary>
        public string? Status { get; set; }

        /// <summary>
        /// 'Normal','Urgent','Critical'
        /// </summary>
        public string? Priority { get; set; }

        public DateTime? CreatedFrom { get; set; }
        public DateTime? CreatedTo { get; set; }
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 20;
    }

    public class TaskStopDto2
    {
        public ulong Id { get; set; }
        public ulong TaskId { get; set; }
        public int SeqNo { get; set; }
        public ulong? DestinationId { get; set; }
        public string? DestinationName { get; set; }
        public string? DestinationArea { get; set; }
        public string? DestinationFloor { get; set; }
        public string? CustomName { get; set; }

        /// <summary>
        /// 'pending','in_progress','awaiting_handover','delivered','skipped','failed'
        /// </summary>
        public string Status { get; set; } = string.Empty;

        public DateTime? EtaAt { get; set; }
        public DateTime? ArrivedAt { get; set; }
        public DateTime? HandedOverAt { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public List<CompartmentAssignmentDto> CompartmentAssignments { get; set; } = new();
    }

}
