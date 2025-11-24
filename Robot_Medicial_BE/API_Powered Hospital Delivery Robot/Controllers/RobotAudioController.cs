using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

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

        /// <summary>
        /// 🎤 Web → Robot: FE gửi 1 chunk audio, mình broadcast cho ROS2
        /// </summary>
        [HttpPost("SendChunk")]
        public async Task<IActionResult> SendChunk([FromBody] AudioChunkDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Audio_b64))
                return BadRequest("Audio_b64 là bắt buộc.");

            try
            {
                _logger.LogInformation(
                    "[RobotAudioController] Đã nhận chunk âm thanh từ Web → Robot. Len={len}, SR={sr}",
                    req.Audio_b64.Length,
                    req.SampleRate
                );

                // 👉 Gửi cho TẤT CẢ client đang nối /hubs/robotaudio
                // Python đang lắng event "ReceiveAudioChunk"
                await _hubContext.Clients.All.SendAsync("ReceiveAudioChunk", req);

                return Ok(new
                {
                    status = "sent",
                    stream_id = req.StreamId ?? "mic_main"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Lỗi khi chuyển tiếp chunk âm thanh từ Web → Robot");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
