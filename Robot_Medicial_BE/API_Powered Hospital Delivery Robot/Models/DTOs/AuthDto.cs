using System.Text.Json.Serialization;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class RegisterRequest
    {
        [JsonIgnore]
        public string? Username { get; set; }
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public string FullName { get; set; } = null!;
    }

    public class LoginDto
    {
        [JsonPropertyName("email")]
        public string Username { get; set; }
        public string Password { get; set; }
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
        [JsonPropertyName("email")]
        public string Username { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }
}
