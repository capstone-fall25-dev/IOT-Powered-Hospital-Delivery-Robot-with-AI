using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho phân bổ ngăn chứa
    /// </summary>
    public class CompartmentAssignmentDto
    {
        public ulong Id { get; set; }

        public ulong? CompartmentId { get; set; }

        [Required]
        public ulong StopId { get; set; }

        [Required]
        public ulong TaskId { get; set; } 

        public string Status { get; set; } = "pending"; 
    }

    /// <summary>
    /// DTO cho nạp hàng vào ngăn chứa
    /// </summary>
    public class LoadCompartmentDto
    {
        [StringLength(255)]
        public string? ItemDesc { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin phân bổ ngăn chứa
    /// </summary>
    public class CompartmentAssignmentResponseDto
    {
        public ulong Id { get; set; }
        public ulong? CompartmentId { get; set; }
        public string? CompartmentCode { get; set; }
        public ulong StopId { get; set; }
        public string? StopCustomName { get; set; }
        public ulong TaskId { get; set; }
        public string Status { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? ItemDesc { get; set; }
    }
}
