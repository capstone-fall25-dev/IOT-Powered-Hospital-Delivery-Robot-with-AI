namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class DestinationPositionDto
    {
        public ulong Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public double X { get; set; }
        public double Y { get; set; }
        public string? Area { get; set; }
        public string? Floor { get; set; }
    }
}
