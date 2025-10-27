using System.Text.Json.Serialization;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class LoginDto
    {

        [JsonPropertyName("email")]
        public string Username { get; set; }
        public string Password { get; set; }
    }
}
