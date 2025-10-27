namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class VerifyForgotPasswordRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
