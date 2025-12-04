using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý nhật ký hệ thống (log từ robot, hệ thống hoặc dịch vụ)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class LogsController : ControllerBase
    {
        private readonly ILogService _service;

        public LogsController(ILogService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy danh sách log (có thể lọc theo robot, nhiệm vụ, loại log)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<LogResponseDto>>> GetAll(
            [FromQuery] ulong? robotId = null,
            [FromQuery] ulong? taskId = null,
            [FromQuery] string? logType = null)
        {
            var logs = await _service.GetAllAsync(robotId, taskId, logType);
            return Ok(logs);
        }

        /// <summary>
        /// Lấy chi tiết một bản ghi log theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<LogResponseDto>> GetById(ulong id)
        {
            var log = await _service.GetByIdAsync(id);
            return log == null
                ? NotFound("Không tìm thấy bản ghi log.")
                : Ok(log);
        }

        /// <summary>
        /// Tạo log mới (thường do robot, hệ thống hoặc dịch vụ tự động ghi)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<LogResponseDto>> Create([FromBody] LogDto logDto)
        {
            try
            {
                var created = await _service.CreateAsync(logDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}