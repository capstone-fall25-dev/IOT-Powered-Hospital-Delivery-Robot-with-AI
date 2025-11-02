namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class PerformanceHistoryDto
    {
        public ulong RobotId { get; set; } // Tự động từ task complete

        public string Destinations { get; set; } = null!; // "Stop1, Stop2"

        public DateTime CompletionDate { get; set; }

        public int DurationSeconds { get; set; }

        public int ErrorCount { get; set; }
    }

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
