using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Điều khiển mở/đóng ngăn chứa robot qua SignalR
    /// </summary>
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
        /// Request từ FE/ROS2 gửi yêu cầu điều khiển ngăn chứa
        /// </summary>
        public class CompartmentSignalRequest
        {
            [Required(ErrorMessage = "CompartmentId là bắt buộc")]
            public ulong CompartmentId { get; set; }

            [Required(ErrorMessage = "Action là bắt buộc")]
            public string? Action { get; set; } // "open" hoặc "close"
        }

        /// <summary>
        /// Gửi tín hiệu mở/đóng ngăn chứa sang ROS2 và cập nhật database
        /// </summary>
        [HttpPost("signal")]
        public async Task<IActionResult> SendCompartmentSignal([FromBody] CompartmentSignalRequest req)
        {
            if (req.CompartmentId == 0)
                return BadRequest("CompartmentId là bắt buộc");

            if (string.IsNullOrWhiteSpace(req.Action))
                return BadRequest("Action là bắt buộc (open hoặc close).");

            string action = req.Action.Trim().ToLower();

            if (action is not ("open" or "close"))
                return BadRequest("Action không hợp lệ. Chỉ chấp nhận: 'open' hoặc 'close'.");

            try
            {
                // Cập nhật trạng thái trong database
                var compartment = action == "open"
                    ? await _service.OpenCompartmentAsync(req.CompartmentId)
                    : await _service.CloseCompartmentAsync(req.CompartmentId);

                if (compartment == null)
                    return NotFound($"Không tìm thấy ngăn chứa có ID = {req.CompartmentId}.");

                // Gửi tín hiệu tới ROS2 qua SignalR
                var signalData = new
                {
                    type = "compartment_control",
                    compartment_code = compartment.CompartmentCode,
                    state = action == "open" ? 1 : 0, // 1=open, 0=close
                    timestamp = DateTimeHelper.Now()
                };

                await _hubContext.Clients.All.SendAsync("ReceiveCompartmentSignal", signalData);
                _logger.LogInformation("📦 Sent compartment signal: {Code} => {Action}", compartment.CompartmentCode, action.ToUpper());

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
                _logger.LogError(ex, "Lỗi nghiêm trọng khi gửi tín hiệu mở/đóng khoang thuốc");
                return StatusCode(500, new
                {
                    error = "Lỗi hệ thống khi điều khiển khoang thuốc.",
                    message = ex.Message
                });
            }
        }
    }
}
