using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RobotModeController : ControllerBase
    {
        private readonly IHubContext<RobotPositionHub> _hubContext;

        public RobotModeController(IHubContext<RobotPositionHub> hubContext)
        {
            _hubContext = hubContext;
        }

        public class RobotModeRequest
        {
            public string Mode { get; set; } = null!;
            public string? MapName { get; set; }
        }

        /// <summary>
        /// Gửi hoạt động xuống ROS2 qua WebSocket (SignalR Hub)
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SendMode([FromBody] RobotModeRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Mode))
                return BadRequest("Mode is required");

            string mode = request.Mode.ToLower();

            if (mode is not ("mapping" or "save_map" or "run_map"))
                return BadRequest("Mode must be one of: mapping, save_map, run_map");

            if ((mode == "save_map" || mode == "run_map") && string.IsNullOrWhiteSpace(request.MapName))
                return BadRequest("MapName is required for save_map and run_map");

            // Dữ liệu gửi xuống ROS2
            var command = new
            {
                type = "robot_mode",
                mode = mode,
                map_name = request.MapName,
                timestamp = DateTime.UtcNow
            };

            // Gửi broadcast tới tất cả ROS2 clients qua SignalR
            await _hubContext.Clients.All.SendAsync("ReceiveRobotCommand", command);

            Console.WriteLine($"📡 Sent command to ROS2: {mode} (map={request.MapName})");

            return Ok(new { status = "sent", mode = mode, map_name = request.MapName });
        }
    }
}
