using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class AlertsController : ControllerBase
    {
        private readonly IAlertService _service;

        public AlertsController(IAlertService service)
        {
            _service = service;
        }

        // Lấy danh sách cảnh báo (có thể lọc theo robot, trạng thái, mức độ nghiêm trọng, mục thuốc...)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AlertResponseDto>>> GetAll(
            [FromQuery] ulong? robotId = null,
            [FromQuery] string? status = null,
            [FromQuery] string? severity = null,
            [FromQuery] ulong? prescriptionItemId = null)
        {
            var alerts = await _service.GetAllAsync(robotId, status, severity, prescriptionItemId);
            return Ok(alerts);
        }

        // Lấy chi tiết một cảnh báo theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<AlertResponseDto>> GetById(ulong id)
        {
            var alert = await _service.GetByIdAsync(id);
            return alert == null
                ? NotFound("Không tìm thấy cảnh báo.")
                : Ok(alert);
        }

        // Tạo cảnh báo mới (thường do robot hoặc hệ thống tự động sinh)
        [HttpPost]
        public async Task<ActionResult<AlertResponseDto>> Create([FromBody] AlertDto alertDto)
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

        // Cập nhật cảnh báo (ví dụ: xác nhận đã xử lý, thay đổi trạng thái)
        [HttpPut("{id}")]
        public async Task<ActionResult<AlertResponseDto>> Update(ulong id, [FromBody] AlertDto alertDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, alertDto);
                return updated == null
                    ? NotFound("Không tìm thấy cảnh báo để cập nhật.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}