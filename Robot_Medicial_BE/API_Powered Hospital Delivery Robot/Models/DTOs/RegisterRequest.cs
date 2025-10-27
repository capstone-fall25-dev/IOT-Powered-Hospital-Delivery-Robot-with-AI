using System.Text.Json.Serialization;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class RegisterRequest
    {
        [JsonIgnore]
        public string ?Username { get; set; }  
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
       
        public string FullName { get; set; } = null!;
    }
}
