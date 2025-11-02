using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AlertsController : ControllerBase
    {
        private readonly IAlertService _service;

        public AlertsController(IAlertService service)
        {
            _service = service;
        }

        // Lấy danh sách cảnh báo (lọc robotId/status/severity/prescriptionItemId) - UC 32: Task Notification Alerts & UC 38: Robot Error Alert Notification (Task Management & Robot Handling)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AlertResponseDto>>> GetAll([FromQuery] ulong? robotId = null, [FromQuery] string? status = null, [FromQuery] string? severity = null, [FromQuery] ulong? prescriptionItemId = null)
        {
            var alerts = await _service.GetAllAsync(robotId, status, severity, prescriptionItemId);
            return Ok(alerts);
        }

        // Lấy chi tiết cảnh báo - UC 32: Task Notification Alerts (Task Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<AlertResponseDto>> GetById(ulong id)
        {
            var alert = await _service.GetByIdAsync(id);
            if (alert == null) return NotFound();
            return Ok(alert);
        }

        // Tạo cảnh báo mới (auto created_at) - UC 32: Task Notification Alerts & UC 38: Robot Error Alert Notification (Task Management & Robot Handling)
        [HttpPost]
        public async Task<ActionResult<AlertResponseDto>> Create(AlertDto alertDto)
        {
            try
            {
                var created = await _service.CreateAsync(alertDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật cảnh báo (e.g., resolve, set resolved_at) - UC 32: Task Notification Alerts (Task Management)
        [HttpPut("{id}")]
        public async Task<ActionResult<AlertResponseDto>> Update(ulong id, AlertDto alertDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, alertDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
