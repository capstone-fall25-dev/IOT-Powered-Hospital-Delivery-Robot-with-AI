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

        /// <summary>
        /// 🎤 ROS2 → Web bằng HTTP:
        /// Python RobotMicStreamer gọi POST /api/RobotMic/SendChunk
        /// </summary>
        [HttpPost("SendChunk")]
        public async Task<IActionResult> SendChunk([FromBody] AudioChunkDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Audio_b64))
                return BadRequest("Audio_b64 is required");

            try
            {
                // Gửi cho FE cùng event như StreamAudioFromRobot
                await _hubContext.Clients.All.SendAsync("ReceiveRobotMicChunk", req);

                return Ok(new
                {
                    status = "sent",
                    stream_id = req.StreamId ?? "robot_mic"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send robot mic chunk");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
