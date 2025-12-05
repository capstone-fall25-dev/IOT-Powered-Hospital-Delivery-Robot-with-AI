namespace API_Powered_Hospital_Delivery_Robot.Models.DTOs
{
    /// <summary>
    /// DTO cho chunk âm thanh từ robot
    /// </summary>
    public class AudioChunkDto
    {
        public string Audio_b64 { get; set; } = string.Empty;
        public int SampleRate { get; set; } = 48000;
        public int Channels { get; set; } = 1;
        public string? StreamId { get; set; }
        public long Timestamp { get; set; }
    }
}
