using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class DestinationDto
    {
        public ulong Id { get; set; }

        [Required]
        public string Name { get; set; } = null!; // Unique
        public string? Area { get; set; }
        public string? Floor { get; set; }
    }

    public class DestinationResponseDto
    {
        public ulong Id { get; set; }
        public string Name { get; set; } = null!;
        public string? Area { get; set; }
        public string? Floor { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
