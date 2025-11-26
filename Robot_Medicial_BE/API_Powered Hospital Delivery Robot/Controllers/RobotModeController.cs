using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
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

        // =======================================================
        // 🧩 GỬI CHẾ ĐỘ HOẠT ĐỘNG (mapping, save_map, run_map)
        // =======================================================
        public class RobotModeRequest
        {
            public string Mode { get; set; } = string.Empty;
            public string? MapName { get; set; }
        }

        [HttpPost("SendMode")]
        public async Task<IActionResult> SendMode([FromBody] RobotModeRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Mode))
                return BadRequest("Mode is required");

            string mode = req.Mode.Trim().ToLower();

            if (mode is not ("mapping" or "save_map" or "run_map"))
                return BadRequest("Mode must be one of: mapping, save_map, run_map");

            if ((mode == "save_map" || mode == "run_map") && string.IsNullOrWhiteSpace(req.MapName))
                return BadRequest("MapName is required for save_map and run_map");

            try
            {
                _currentMode = mode;

                var command = new
                {
                    type = "robot_mode",
                    mode,
                    map_name = req.MapName,
                    timestamp = DateTime.UtcNow
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

        // =======================================================
        // 📍 GỬI VỊ TRÍ ROBOT (x, y, theta)
        // =======================================================
        public class RobotPositionRequest
        {
            public double X { get; set; }
            public double Y { get; set; }
            public double Theta { get; set; }
        }

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
                    timestamp = DateTime.UtcNow
                };

                await _hubContext.Clients.All.SendAsync("ReceivePosition", positionData);
                // _logger.LogInformation("📡 [From Robot] Position => X={X}, Y={Y}, θ={Theta}", pos.X, pos.Y, pos.Theta);

                return Ok(new { status = "broadcasted", position = positionData });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to broadcast robot position");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // =======================================================
        // 🗺️ NHẬN DỮ LIỆU MAP TỪ ROS2 (mapping)
        // =======================================================
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

        [HttpPost("map-update")]
        public async Task<IActionResult> ReceiveMapUpdate([FromBody] MapUpdateRequest map)
        {
            try
            {

                await _hubContext.Clients.All.SendAsync("ReceiveMapUpdate", map);
              //  _logger.LogInformation("🗺️ [Mapping] Map frame received (w={Width}, h={Height})", map.Width, map.Height);

                return Ok(new { status = "received", width = map.Width, height = map.Height });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Failed to handle map update");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // =======================================================
        // ⚙️ GỬI LỆNH ĐIỀU KHIỂN ĐỘNG CƠ (A, W, D, S, X)
        // =======================================================
        public class MotorCommandRequest
        {
            public string Key { get; set; } = string.Empty; // "w", "a", "s", "d", "x"
        }

        /// <summary>
        /// 🕹️ FE gửi phím điều khiển (A/W/S/D/X) => Broadcast cho ROS2 xử lý
        /// </summary>
        [HttpPost("control")]
        public async Task<IActionResult> SendMotorCommand([FromBody] MotorCommandRequest req)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(req.Key))
                    return BadRequest("Key is required (a, w, s, d, x)");

                string key = req.Key.Trim().ToLower();
                if (key is not ("a" or "w" or "s" or "d" or "x"))
                    return BadRequest("Invalid key. Allowed: a, w, s, d, x");

                var motorCommand = new
                {
                    type = "motor_control",
                    key,
                    timestamp = DateTime.UtcNow
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
