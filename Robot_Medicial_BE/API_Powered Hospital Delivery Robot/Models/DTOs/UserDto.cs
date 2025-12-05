using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo/cập nhật nhân viên
    /// </summary>
    public class UserDto
    {
        public ulong Id { get; set; }

        [Required]
        [StringLength(64)]
        [EmailAddress]
        public string Email { get; set; } = null!;

        [Required]
        [StringLength(255)]
        [MinLength(6)]
        public string Password { get; set; } = null!; // Chỉ input, hash thành PasswordHash

        [StringLength(128)]
        public string? FullName { get; set; }

        [Required]
        public string Role { get; set; } = null!;

        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// DTO phản hồi thông tin nhân viên kèm Tasks và ActiveSessions
    /// </summary>
    public class UserResponseDto
    {
        public ulong Id { get; set; }
        public string Email { get; set; } = null!;
        public string? FullName { get; set; }
        public string Role { get; set; } = null!;
        public bool IsActive { get; set; }
        public bool IsOnline { get; set; } // Real-time: Có session active không
        public IEnumerable<TaskResponseDto> Tasks { get; set; } = new List<TaskResponseDto>(); // Lịch sử nhiệm vụ
        public IEnumerable<SessionResponseDto> ActiveSessions { get; set; } = new List<SessionResponseDto>(); // Phiên online để theo dõi hoạt động
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>
    /// DTO cho trạng thái real-time của nhân viên
    /// </summary>
    public class UserStatusDto
    {
        public bool IsOnline { get; set; }
        public IEnumerable<SessionResponseDto> ActiveSessions { get; set; } = new List<SessionResponseDto>();
        public DateTime LastActivity { get; set; }
    }
}
