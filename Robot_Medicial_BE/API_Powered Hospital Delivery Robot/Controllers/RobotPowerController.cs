using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Điều khiển bật/tắt robot qua SignalR
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RobotPowerController : ControllerBase
    {
        private readonly IHubContext<RobotHub> _hubContext;
        private readonly ILogger<RobotPowerController> _logger;
        private static bool _isRobotOn = false;

        public RobotPowerController(IHubContext<RobotHub> hubContext, ILogger<RobotPowerController> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        /// <summary>
        /// Bật/tắt robot (toggle trạng thái)
        /// </summary>
        [HttpPost("toggle")]
        public async Task<IActionResult> TogglePower()
        {
            _isRobotOn = !_isRobotOn;
            string state = _isRobotOn ? "on" : "off";

            _logger.LogInformation("🟡 [API] TogglePower called. New state = {State}", state);

            var command = new
            {
                type = "robot_power",
                state,
                timestamp = DateTime.Now
            };

            // Gửi tới tất cả client kết nối SignalR
            _logger.LogInformation("📡 [SignalR] Sending ReceiveRobotPower → state = {State}", state);
            await _hubContext.Clients.All.SendAsync("ReceiveRobotPower", command);

            _logger.LogInformation("✅ [API] Command sent successfully to all clients.");
            return Ok(new { status = "ok", power = _isRobotOn });
        }

        /// <summary>
        /// Node.js/ROS2 gửi phản hồi khi đã thực thi xong
        /// </summary>
        [HttpPost("report")]
        public async Task<IActionResult> ReportPower([FromBody] PowerReport report)
        {
            if (report == null)
            {
                _logger.LogWarning("⚠️ [API] ReportPower called with null body.");
                return BadRequest("Nội dung báo cáo không được để trống.");
            }

            _isRobotOn = report.Power;
            string state = _isRobotOn ? "on" : "off";

            _logger.LogInformation("📥 [REPORT] Received from {Source}: Robot state = {State}", report.Source, state);

            // Broadcast trạng thái cho toàn bộ FE đang kết nối
            var message = new
            {
                power = _isRobotOn,
                reportedBy = report.Source,
                time = DateTime.Now
            };

            _logger.LogInformation("📡 [SignalR] Broadcasting RobotPowerStatus → {State}", state);
            await _hubContext.Clients.All.SendAsync("RobotPowerStatus", message);

            _logger.LogInformation("✅ [REPORT] Power state updated successfully ({State})", state);

            return Ok(new { status = "ok", currentPower = _isRobotOn });
        }

        /// <summary>
        /// Model báo cáo trạng thái robot
        /// </summary>
        public class PowerReport
        {
            public bool Power { get; set; }
            public string Source { get; set; } = "unknown";
        }
    }
}
