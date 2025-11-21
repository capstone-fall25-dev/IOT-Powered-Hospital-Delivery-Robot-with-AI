using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

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
        /// 🎤 Web → Robot: nhận 1 chunk audio từ FE và bắn xuống ROS2 qua SignalR
        /// FE gọi: POST /api/RobotAudio/SendChunk
        /// </summary>
        [HttpPost("SendChunk")]
        public async Task<IActionResult> SendChunk([FromBody] AudioChunkDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Audio_b64))
                return BadRequest("Audio_b64 is required");

            try
            {
                // Gửi cho tất cả client đang nối vào /hubs/robotaudio
                // Python audio_call_node.py đang lắng "ReceiveAudioChunk"
                await _hubContext.Clients.All.SendAsync("ReceiveAudioChunk", req);

                return Ok(new
                {
                    status = "sent",
                    stream_id = req.StreamId ?? "mic_main"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send audio chunk from Web to Robot");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
