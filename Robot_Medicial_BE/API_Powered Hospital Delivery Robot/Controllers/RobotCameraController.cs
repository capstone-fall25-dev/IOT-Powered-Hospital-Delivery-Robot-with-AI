using API_Powered_Hospital_Delivery_Robot.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Xử lý nhận và broadcast frame camera từ robot
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RobotCameraController : ControllerBase
    {
        private readonly IHubContext<RobotCameraHub> _hubContext;
        private readonly ILogger<RobotCameraController> _logger;

        public RobotCameraController(IHubContext<RobotCameraHub> hubContext, ILogger<RobotCameraController> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        /// <summary>
        /// Request gửi frame camera
        /// </summary>
        public class CameraFrameRequest
        {
            public string Image_b64 { get; set; } = string.Empty;   // Ảnh base64 (jpg/png)
            public string? FrameId { get; set; }                     // frame name / source
            public long Timestamp { get; set; }                      // epoch milliseconds
        }

        /// <summary>
        /// Nhận frame từ ROS2 hoặc Node.js và broadcast tới FE
        /// </summary>
        [HttpPost("SendFrame")]
        public async Task<IActionResult> SendFrame([FromBody] CameraFrameRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Image_b64))
                return BadRequest("Image_b64 là bắt buộc");

            try
            {
                var frameData = new
                {
                    type = "camera_frame",
                    frame_id = req.FrameId ?? "cam_main",
                    image_b64 = req.Image_b64,
                    timestamp = req.Timestamp > 0
                        ? DateTimeOffset.FromUnixTimeMilliseconds(req.Timestamp).UtcDateTime
                        : DateTimeHelper.Now()
                };

                await _hubContext.Clients.All.SendAsync("ReceiveCameraFrame", frameData);

                return Ok(new { status = "sent", frame_id = req.FrameId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send camera frame");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
