using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize] 
    public class PerformanceHistoriesController : ControllerBase
    {
        private readonly IPerformanceHistoryService _service;

        public PerformanceHistoriesController(IPerformanceHistoryService service)
        {
            _service = service;
        }

        // Lấy danh sách lịch sử hiệu suất (có thể lọc theo robot)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PerformanceHistoryResponseDto>>> GetAll(
            [FromQuery] ulong? robotId = null)
        {
            var histories = await _service.GetAllAsync(robotId);
            return Ok(histories);
        }

        // Lấy chi tiết một bản ghi hiệu suất theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<PerformanceHistoryResponseDto>> GetById(ulong id)
        {
            var history = await _service.GetByIdAsync(id);
            return history == null
                ? NotFound("Không tìm thấy bản ghi hiệu suất.")
                : Ok(history);
        }

        // Tạo mới bản ghi hiệu suất (thường do robot hoặc hệ thống tự động ghi lại)
        [HttpPost]
        public async Task<ActionResult<PerformanceHistoryResponseDto>> Create([FromBody] PerformanceHistoryDto historyDto)
        {
            try
            {
                var created = await _service.CreateAsync(historyDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}