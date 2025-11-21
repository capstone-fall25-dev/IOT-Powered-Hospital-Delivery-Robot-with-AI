namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    public class AudioChunkDto
    {
        // Tên property trùng với JSON: Audio_b64
        public string Audio_b64 { get; set; } = string.Empty;
        public int SampleRate { get; set; } = 48000;
        public int Channels { get; set; } = 1;
        public string? StreamId { get; set; }
        public long Timestamp { get; set; }
    }
}
