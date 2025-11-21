using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RobotAudioController : ControllerBase
    {
        private readonly IHubContext<RobotAudioHub> _hubContext;
        private readonly ILogger<RobotAudioController> _logger;

        public RobotAudioController(
            IHubContext<RobotAudioHub> hubContext,
            ILogger<RobotAudioController> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        // YÊU CẦU: web gửi các chunk PCM (16-bit) dạng base64
        public class AudioChunkRequest
        {
            public string Audio_b64 { get; set; } = string.Empty;  // base64 của PCM 16bit
            public int SampleRate { get; set; } = 48000;           // ví dụ: 16000 hoặc 48000
            public int Channels { get; set; } = 1;                 // mono = 1
            public string? StreamId { get; set; }                  // để phân biệt nhiều stream
            public long Timestamp { get; set; }                    // epoch ms
        }

        /// <summary>
        /// 🎤 Nhận 1 chunk audio từ Web → broadcast xuống ROS2 qua SignalR
        /// </summary>
        [HttpPost("SendChunk")]
        public async Task<IActionResult> SendChunk([FromBody] AudioChunkRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Audio_b64))
                return BadRequest("Audio_b64 is required");

            try
            {
                var chunkData = new
                {
                    type = "audio_chunk",
                    stream_id = req.StreamId ?? "mic_main",
                    audio_b64 = req.Audio_b64,
                    sampleRate = req.SampleRate,
                    channels = req.Channels,
                    timestamp = req.Timestamp > 0
                        ? DateTimeOffset.FromUnixTimeMilliseconds(req.Timestamp).UtcDateTime
                        : DateTime.UtcNow
                };

                // Gửi cho TẤT CẢ client đang kết nối RobotAudioHub (trong đó có ROS2)
                await _hubContext.Clients.All.SendAsync("ReceiveAudioChunk", chunkData);

                return Ok(new { status = "sent", stream_id = chunkData.stream_id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send audio chunk");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
