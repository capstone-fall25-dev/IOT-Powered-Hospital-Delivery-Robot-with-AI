using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RobotCompartmentSignalController : ControllerBase
    {
        private readonly IRobotCompartmentService _service;
        private readonly IHubContext<RobotPositionHub> _hubContext;
        private readonly ILogger<RobotCompartmentSignalController> _logger;

        public RobotCompartmentSignalController(
            IRobotCompartmentService service,
            IHubContext<RobotPositionHub> hubContext,
            ILogger<RobotCompartmentSignalController> logger)
        {
            _service = service;
            _hubContext = hubContext;
            _logger = logger;
        }

        /// <summary>
        /// 📦 DTO: Request từ FE/ROS2 gửi yêu cầu điều khiển ngăn thuốc
        /// </summary>
        public class CompartmentSignalRequest
        {
            public ulong CompartmentId { get; set; }
            public string? Action { get; set; } // "open" hoặc "close"
        }

        /// <summary>
        /// 📡 Gửi tín hiệu mở/đóng ngăn thuốc sang ROS2 và cập nhật DB
        /// </summary>
        [HttpPost("signal")]
        public async Task<IActionResult> SendCompartmentSignal([FromBody] CompartmentSignalRequest req)
        {
            if (req.CompartmentId == 0)
                return BadRequest("CompartmentId is required");

            if (string.IsNullOrWhiteSpace(req.Action))
                return BadRequest("Action must be 'open' or 'close'");

            string action = req.Action.Trim().ToLower();

            if (action is not ("open" or "close"))
                return BadRequest("Invalid action: must be 'open' or 'close'");

            try
            {
                // 1️⃣ Cập nhật trạng thái trong DB
                var compartment = action == "open"
                    ? await _service.OpenCompartmentAsync(req.CompartmentId)
                    : await _service.CloseCompartmentAsync(req.CompartmentId);

                if (compartment == null)
                    return NotFound($"Compartment with ID={req.CompartmentId} not found.");

                // 2️⃣ Gửi tín hiệu tới ROS2 qua SignalR
                var signalData = new
                {
                    type = "compartment_control",
                    compartment_code = compartment.CompartmentCode,
                    state = action == "open" ? 1 : 0, // 1=open, 0=close
                    timestamp = DateTime.UtcNow
                };

                await _hubContext.Clients.All.SendAsync("ReceiveCompartmentSignal", signalData);
                _logger.LogInformation("📦 Sent compartment signal: {Code} => {Action}", compartment.CompartmentCode, action.ToUpper());

                // 3️⃣ Trả về kết quả
                return Ok(new
                {
                    status = "sent",
                    action,
                    compartment
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning("⚠️ Invalid input: {Message}", ex.Message);
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("⚠️ Operation error: {Message}", ex.Message);
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Internal error while sending compartment signal");
                return StatusCode(500, new
                {
                    error = "Internal server error",
                    message = ex.Message
                });
            }
        }
    }
}
