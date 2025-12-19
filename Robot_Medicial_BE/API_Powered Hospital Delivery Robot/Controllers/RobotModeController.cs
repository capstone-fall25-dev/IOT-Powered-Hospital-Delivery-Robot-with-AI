using API_Powered_Hospital_Delivery_Robot.Helpers;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Điều khiển chế độ hoạt động robot và nhận dữ liệu từ ROS2
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RobotModeController : ControllerBase
    {
        private readonly IHubContext<RobotPositionHub> _hubContext;
        private readonly ILogger<RobotModeController> _logger;

        private static string? _currentMode = null;

        public RobotModeController(
            IHubContext<RobotPositionHub> hubContext,
            ILogger<RobotModeController> logger)
        {
            _hubContext = hubContext;
            _logger = logger;
        }

        /// <summary>
        /// Request gửi chế độ hoạt động robot
        /// </summary>
        public class RobotModeRequest
        {
            public string Mode { get; set; } = string.Empty;
            public string? MapName { get; set; }
        }

        /// <summary>
        /// Gửi chế độ hoạt động robot (mapping, save_map, run_map)
        /// </summary>
        [HttpPost("SendMode")]
        public async Task<IActionResult> SendMode([FromBody] RobotModeRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Mode))
                return BadRequest("Mode là bắt buộc");

            string mode = req.Mode.Trim().ToLower();

            if (mode is not ("mapping" or "save_map" or "run_map"))
                return BadRequest("Mode phải là một trong: mapping, save_map, run_map");

            if ((mode == "save_map" || mode == "run_map") && string.IsNullOrWhiteSpace(req.MapName))
                return BadRequest("Tên bản đồ là bắt buộc cho save map và run map");

            try
            {
                _currentMode = mode;

                var command = new
                {
                    type = "robot_mode",
                    mode,
                    map_name = req.MapName,
                    timestamp = DateTimeHelper.Now()
                };

                await _hubContext.Clients.All.SendAsync("ReceiveRobotCommand", command);
                _logger.LogInformation("🤖 Sent robot mode command: {Mode} (map={Map})", mode, req.MapName);

                return Ok(new { status = "sent", mode, map_name = req.MapName });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send robot mode command");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Request gửi vị trí robot
        /// </summary>
        public class RobotPositionRequest
        {
            public double X { get; set; }
            public double Y { get; set; }
            public double Theta { get; set; }
        }

        /// <summary>
        /// Cập nhật vị trí robot (x, y, theta)
        /// </summary>
        [HttpPost("update-position")]
        public async Task<IActionResult> UpdateRobotPosition([FromBody] RobotPositionRequest pos)
        {
            try
            {
                var positionData = new
                {
                    type = "robot_position",
                    x = pos.X,
                    y = pos.Y,
                    theta = pos.Theta,
                    timestamp = DateTimeHelper.Now()
                };

                await _hubContext.Clients.All.SendAsync("ReceivePosition", positionData);

                return Ok(new { status = "broadcasted", position = positionData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to broadcast robot position");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Request nhận dữ liệu map từ ROS2
        /// </summary>
        public class MapUpdateRequest
        {
            public string Type { get; set; } = "map_update";
            public long Timestamp { get; set; }
            public double Resolution { get; set; }
            public int Width { get; set; }
            public int Height { get; set; }
            public OriginData Origin { get; set; } = new();
            public string Data_b64 { get; set; } = string.Empty;

            public class OriginData
            {
                public double X { get; set; }
                public double Y { get; set; }
                public double Z { get; set; }
            }
        }

        /// <summary>
        /// Nhận dữ liệu map từ ROS2 (mapping)
        /// </summary>
        [HttpPost("map-update")]
        public async Task<IActionResult> ReceiveMapUpdate([FromBody] MapUpdateRequest map)
        {
            try
            {
                await _hubContext.Clients.All.SendAsync("ReceiveMapUpdate", map);

                return Ok(new { status = "received", width = map.Width, height = map.Height });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to handle map update");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Request nhận phần trăm hoàn thành task dạng text
        /// </summary>
        public class ProgressTextRequest
        {
            public string Text { get; set; } = string.Empty;
        }

        /// <summary>
        /// Nhận phần trăm hoàn thành task dạng text (ví dụ: "RB-01|37.5|Phòng 102")
        /// </summary>
        [HttpPost("navigation-progress")]
        public async Task<IActionResult> NavigationProgress([FromBody] ProgressTextRequest req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.Text))
                return BadRequest("Văn bản là bắt buộc");

            try
            {
                var payload = new
                {
                    type = "navigation_progress",
                    text = req.Text,
                    timestamp = DateTimeHelper.Now()
                };

                await _hubContext.Clients.All.SendAsync("ReceiveNavigationProgress", payload);

                _logger.LogInformation("📊 [Progress] {Text}", req.Text);

                return Ok(new { status = "broadcasted", text = req.Text });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to broadcast navigation progress");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// Request gửi lệnh điều khiển động cơ
        /// </summary>
        public class MotorCommandRequest
        {
            public string Key { get; set; } = string.Empty; // "w", "a", "s", "d", "x"
        }

        /// <summary>
        /// Gửi lệnh điều khiển động cơ (A/W/S/D/X) từ FE xuống ROS2
        /// </summary>
        [HttpPost("control")]
        public async Task<IActionResult> SendMotorCommand([FromBody] MotorCommandRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Key))
                    return BadRequest("Key là bắt buộc (a, w, s, d, x)");

                string key = req.Key.Trim().ToLower();
                if (key is not ("a" or "w" or "s" or "d" or "x"))
                    return BadRequest("Key không hợp lệ. Cho phép: a, w, s, d, x");

                var motorCommand = new
                {
                    type = "motor_control",
                    key,
                    timestamp = DateTimeHelper.Now()
                };

                await _hubContext.Clients.All.SendAsync("ReceiveMotorCommand", motorCommand);
                _logger.LogInformation("🕹️ Motor command sent: {Key}", key);

                return Ok(new { status = "sent", command = motorCommand });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to send motor command");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
