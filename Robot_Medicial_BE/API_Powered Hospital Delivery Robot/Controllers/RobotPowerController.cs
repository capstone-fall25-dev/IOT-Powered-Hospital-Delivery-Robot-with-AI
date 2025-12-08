using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Điều khiển bật/tắt robot qua SignalR (ủy quyền cho RobotService)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RobotPowerController : ControllerBase
    {
        private readonly IRobotService _robotService;
        private readonly ILogger<RobotPowerController> _logger;

        public RobotPowerController(IRobotService robotService, ILogger<RobotPowerController> logger)
        {
            _robotService = robotService;
            _logger = logger;
        }

        /// <summary>
        /// Gửi lệnh bật/tắt robot. YÊU CẦU body có robotCode (ví dụ "RBT001").
        /// Không ghi DB tại đây; DB chỉ cập nhật khi ROS2 gọi /report.
        /// </summary>
        [HttpPost("toggle")]
        public async Task<IActionResult> TogglePower([FromBody] ToggleRequestDto req)
        {
            if (req == null || string.IsNullOrWhiteSpace(req.RobotCode))
                return BadRequest(new { error = "robotCode không được để trống." });

            try
            {
                _logger.LogInformation("🟡 [API] TogglePower called for {RobotCode}", req.RobotCode);
                var result = await _robotService.TogglePowerAsync(req);
                // result.Message = "sent" (đã phát lệnh xuống ROS2)
                return Ok(result);
            }
            catch (InvalidOperationException ioe)
            {
                _logger.LogWarning(ioe, "TogglePower rejected for {RobotCode}", req.RobotCode);
                return StatusCode(403, new { error = ioe.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "TogglePower failed for {RobotCode}", req.RobotCode);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        /// <summary>
        /// ROS2 báo cáo kết quả thực thi. Ghi DB (on→at_station, off→offline) và broadcast ack.
        /// </summary>
        [HttpPost("report")]
        public async Task<IActionResult> ReportPower([FromBody] PowerReportDto report)
        {
            if (report == null || string.IsNullOrWhiteSpace(report.RobotCode))
                return BadRequest(new { error = "Thiếu robotCode." });

            try
            {
                _logger.LogInformation("📥 [REPORT] {RobotCode} from {Source} | power={Power}",
                    report.RobotCode, report.Source, report.Power);

                var result = await _robotService.ReportPowerAsync(report);
                // result.Message = "ok" (đã persist & broadcast)
                return Ok(result);
            }
            catch (InvalidOperationException ioe)
            {
                _logger.LogWarning(ioe, "ReportPower invalid for {RobotCode}", report.RobotCode);
                return StatusCode(400, new { error = ioe.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ReportPower failed for {RobotCode}", report.RobotCode);
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
