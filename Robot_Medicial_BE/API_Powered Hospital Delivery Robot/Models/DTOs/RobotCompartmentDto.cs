namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class RobotCompartmentResponseDto
    {
        public ulong Id { get; set; }
        public ulong RobotId { get; set; }
        public string CompartmentCode { get; set; } = null!;
        public string Status { get; set; } = null!; 
        public string? ContentLabel { get; set; }
        public bool IsActive { get; set; }
        public ulong? PatientId { get; set; }
        public ulong? CategoryId { get; set; }
    }
}