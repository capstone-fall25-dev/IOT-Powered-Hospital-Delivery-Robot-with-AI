using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý cảnh báo hệ thống (từ robot hoặc hệ thống tự động)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class AlertsController : ControllerBase
    {
        private readonly IAlertService _service;

        public AlertsController(IAlertService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy danh sách cảnh báo (có thể lọc theo robot, trạng thái, mức độ nghiêm trọng, mục thuốc)
        /// </summary>
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

        /// <summary>
        /// Lấy chi tiết một cảnh báo theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<AlertResponseDto>> GetById(ulong id)
        {
            var alert = await _service.GetByIdAsync(id);
            return alert == null
                ? NotFound("Không tìm thấy cảnh báo.")
                : Ok(alert);
        }

        /// <summary>
        /// Tạo cảnh báo mới (thường do robot hoặc hệ thống tự động sinh)
        /// </summary>
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

        /// <summary>
        /// Cập nhật cảnh báo (xác nhận đã xử lý, thay đổi trạng thái)
        /// </summary>
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