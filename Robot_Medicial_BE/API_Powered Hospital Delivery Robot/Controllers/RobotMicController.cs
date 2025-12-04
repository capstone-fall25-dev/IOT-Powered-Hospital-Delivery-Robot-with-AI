using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Xử lý nhận audio từ robot (microphone) và broadcast tới web
    /// </summary>
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
        /// ROS2 gửi audio chunk từ robot microphone qua HTTP, broadcast tới FE
        /// </summary>
        [HttpPost("SendChunk")]
        public async Task<IActionResult> SendChunk([FromBody] AudioChunkDto req)
        {
            if (string.IsNullOrWhiteSpace(req.Audio_b64))
                return BadRequest("Audio_b64 là bắt buộc và không được để trống.");

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
                _logger.LogError(ex, "Lỗi khi chuyển tiếp audio chunk từ robot");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
