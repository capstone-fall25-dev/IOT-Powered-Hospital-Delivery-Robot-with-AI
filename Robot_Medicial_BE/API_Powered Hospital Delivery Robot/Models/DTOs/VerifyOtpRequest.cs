namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class VerifyOtpRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }
}
