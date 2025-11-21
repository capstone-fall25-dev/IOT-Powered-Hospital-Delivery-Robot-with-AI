using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RobotMicController : ControllerBase
    {
        private readonly IHubContext<RobotAudioHub> _hubContext;
        private readonly ILogger<RobotMicController> _logger;

        public RobotMicController(
            IHubContext<RobotAudioHub> hubContext,
            ILogger<RobotMicController> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        public class RobotMicChunkRequest
        {
            public string Audio_b64 { get; set; } = string.Empty;  // PCM 16-bit base64
            public int SampleRate { get; set; } = 48000;           // ví dụ: 48000
            public int Channels { get; set; } = 1;                 // mono
            public string? StreamId { get; set; }                  // để phân biệt nhiều robot
            public long Timestamp { get; set; }                    // epoch ms
        }

        /// <summary>
        /// 🎤 ROS2 gửi audio chunk lên → broadcast cho FE nghe
        /// </summary>
        [HttpPost("SendChunk")]
        public async Task<IActionResult> SendChunk([FromBody] RobotMicChunkRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Audio_b64))
                return BadRequest("Audio_b64 is required");

            try
            {
                var msg = new
                {
                    type = "robot_mic_chunk",
                    stream_id = req.StreamId ?? "robot_mic",
                    audio_b64 = req.Audio_b64,
                    sampleRate = req.SampleRate,
                    channels = req.Channels,
                    timestamp = req.Timestamp > 0
                        ? DateTimeOffset.FromUnixTimeMilliseconds(req.Timestamp).UtcDateTime
                        : DateTime.UtcNow
                };

                // 🚀 Gửi cho tất cả client nối vào /hubs/robotaudio
                await _hubContext.Clients.All.SendAsync("ReceiveRobotMicChunk", msg);

                return Ok(new { status = "sent", stream_id = msg.stream_id });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send robot mic chunk");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
