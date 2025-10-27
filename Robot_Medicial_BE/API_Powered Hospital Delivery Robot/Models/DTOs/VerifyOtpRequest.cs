using System.Text.Json.Serialization;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class VerifyOtpRequest
    {


        [JsonPropertyName("email")]
        public string Username { get; set; } = string.Empty;
        public string Otp { get; set; } = string.Empty;
    }
}
