using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class RoomDto
    {
        [Required]
        [StringLength(128)]
        public string RoomName { get; set; } = null!;

        public decimal? Longitude { get; set; }

        public decimal? Latitude { get; set; }

        public ulong? MapId { get; set; }
    }

    public class RoomResponseDto
    {
        public ulong Id { get; set; }
        public string RoomName { get; set; } = null!;
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
        public ulong? MapId { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
