namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo lịch sử hiệu suất robot
    /// </summary>
    public class PerformanceHistoryDto
    {
        public ulong RobotId { get; set; }
        public string Destinations { get; set; } = null!;
        public DateTime CompletionDate { get; set; }
        public int DurationSeconds { get; set; }
        public int ErrorCount { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin lịch sử hiệu suất robot
    /// </summary>
    public class PerformanceHistoryResponseDto
    {
        public ulong Id { get; set; }
        public ulong RobotId { get; set; }
        public string RobotCode { get; set; } = null!;
        public string Destinations { get; set; } = null!;
        public DateTime CompletionDate { get; set; }
        public int DurationSeconds { get; set; }
        public int ErrorCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
