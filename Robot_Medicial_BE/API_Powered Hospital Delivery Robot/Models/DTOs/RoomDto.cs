using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho tạo/cập nhật phòng bệnh
    /// </summary>
    public class RoomDto
    {
        [Required]
        [StringLength(128)]
        public string RoomName { get; set; } = null!;

        public decimal? Longitude { get; set; }

        public decimal? Latitude { get; set; }

        public ulong? MapId { get; set; }
    }

    /// <summary>
    /// DTO phản hồi thông tin phòng bệnh
    /// </summary>
    public class RoomResponseDto
    {
        public ulong Id { get; set; }
        public string RoomName { get; set; } = null!;
        public decimal? Longitude { get; set; }
        public decimal? Latitude { get; set; }
        public ulong? MapId { get; set; }
        public DateTime CreatedAt { get; set; }
        public int PatientCount { get; set; }
        public List<PatientInRoomDto> Patients { get; set; } = new();
    }

    /// <summary>
    /// DTO thông tin bệnh nhân trong phòng
    /// </summary>
    public class PatientInRoomDto
    {
        public ulong Id { get; set; }
        public string PatientCode { get; set; } = "";
        public string FullName { get; set; } = "";
        public string Gender { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime? CreatedAt { get; set; }
    }

    /// <summary>
    /// DTO cho chuyển bệnh nhân sang phòng khác
    /// </summary>
    public class PatientMoveRoomDto
    {
        public ulong NewRoomId { get; set; }
    }
}
