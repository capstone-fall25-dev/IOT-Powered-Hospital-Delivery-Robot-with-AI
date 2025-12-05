namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs;

/// <summary>
/// DTO phản hồi lịch sử task
/// </summary>
public class TaskHistoryResponseDto
{
    public ulong Id { get; set; }
    public ulong TaskId { get; set; }
    public ulong RobotId { get; set; }
    public string RobotCode { get; set; } = null!;
    public string? RobotName { get; set; }

    public string AssignedByName { get; set; } = null!;
    public string AssignedByEmail { get; set; } = null!;
    public string? PatientName { get; set; } = null!;
    public string? MapName { get; set; }

    public string Priority { get; set; } = null!;
    public string FinalStatus { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
    public DateTime? ScheduledStartAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int? TotalDurationS { get; set; }
    public int TotalErrors { get; set; }

    public int TotalStops { get; set; }
    public int DeliveredStops { get; set; }
    public int SkippedStops { get; set; }
    public int FailedStops { get; set; }

    public DateTime RecordedAt { get; set; }

    public List<TaskStopHistoryDto> Stops { get; set; } = new();
}

/// <summary>
/// DTO lịch sử điểm dừng của task
/// </summary>
public class TaskStopHistoryDto
{
    public int SeqNo { get; set; }
    public string DestinationName { get; set; } = null!;
    public string? PatientCode { get; set; }
    public string? PatientName { get; set; } = null!;
    public string? RoomNumber { get; set; }
    public string? CompartmentCode { get; set; }
    public string? ItemDesc { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? ArrivedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public int? DurationSeconds { get; set; }
}

/// <summary>
/// DTO cho lọc lịch sử task
/// </summary>
public class TaskHistoryFilterDto
{
    public ulong? RobotId { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// DTO phân trang lịch sử task
/// </summary>
public class PagedTaskHistoryDto
{
    public List<TaskHistoryResponseDto> Data { get; set; } = new();
    public int TotalCount { get; set; }

    public int PageSize { get; set; }
    public int CurrentPage { get; set; }

    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
