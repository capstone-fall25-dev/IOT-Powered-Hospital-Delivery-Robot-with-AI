using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class LogDto
    {
        [Required]
        public ulong RobotId { get; set; }

        public ulong? TaskId { get; set; }

        public ulong? StopId { get; set; }

        [Required]
        public string LogType { get; set; } = "info"; 

        [Required]
        [StringLength(500)]
        public string Message { get; set; } = null!;
    }

    public class LogResponseDto
    {
        public ulong Id { get; set; }
        public ulong RobotId { get; set; }
        public ulong? TaskId { get; set; }
        public ulong? StopId { get; set; }
        public string LogType { get; set; } = null!;
        public string Message { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
    }
}
