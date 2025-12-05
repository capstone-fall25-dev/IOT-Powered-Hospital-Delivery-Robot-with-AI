using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho đăng ký nhân viên mới
    /// </summary>
    public class RegisterRequest
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Role { get; set; } = "doctor";
    }

    /// <summary>
    /// DTO cho đăng nhập
    /// </summary>
    public class LoginDto
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    /// <summary>
    /// DTO cho quên mật khẩu
    /// </summary>
    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO phản hồi xác thực
    /// </summary>
    public class AuthResponseDto
    {
        public string Token { get; set; } = null!;
        public string Message { get; set; } = null!;
    }

    /// <summary>
    /// DTO cho xác thực quên mật khẩu
    /// </summary>
    public class VerifyForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho xác thực OTP
    /// </summary>
    public class VerifyOtpRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO cho cập nhật profile nhân viên (không cho phép đổi Email, Role, IsActive)
    /// </summary>
    public class UpdateProfileDto
    {
        [Required]
        [StringLength(128, MinimumLength = 2)]
        public string FullName { get; set; } = null!;
    }

    /// <summary>
    /// DTO cho đổi mật khẩu
    /// </summary>
    public class ChangePasswordDto
    {
        [Required]
        [StringLength(255, MinimumLength = 6)]
        public string CurrentPassword { get; set; } = null!;

        [Required]
        [StringLength(255, MinimumLength = 6)]
        public string NewPassword { get; set; } = null!;

        [Required]
        [Compare("NewPassword", ErrorMessage = "Mật khẩu xác nhận không khớp.")]
        public string ConfirmPassword { get; set; } = null!;
    }

    /// <summary>
    /// DTO phản hồi thông tin profile nhân viên
    /// </summary>
    public class ProfileResponseDto
    {
        public ulong Id { get; set; }
        public string Email { get; set; } = null!;
        public string? FullName { get; set; }
        public string Role { get; set; } = null!;
        public bool? IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
