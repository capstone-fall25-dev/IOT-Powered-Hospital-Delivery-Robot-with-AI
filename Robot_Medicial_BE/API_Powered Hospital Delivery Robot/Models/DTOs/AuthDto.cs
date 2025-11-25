using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class RegisterRequest
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string FullName { get; set; } = null!;
        public string Role { get; set; } = "doctor";
    }

    public class LoginDto
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class ForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        public string Token { get; set; }
        public string Message { get; set; }
    }

    public class VerifyForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class VerifyOtpRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }

    /// <summary>
    /// DTO để user update profile của chính họ
    /// Không cho phép đổi Email, Role, IsActive
    /// </summary>
    public class UpdateProfileDto
    {
        [Required]
        [StringLength(128, MinimumLength = 2)]
        public string FullName { get; set; } = null!;
    }

    // DTO để đổi mật khẩu
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
