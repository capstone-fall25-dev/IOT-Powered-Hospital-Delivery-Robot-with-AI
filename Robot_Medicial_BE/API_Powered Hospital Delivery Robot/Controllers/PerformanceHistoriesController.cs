using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PerformanceHistoriesController : ControllerBase
    {
        private readonly IPerformanceHistoryService _service;

        public PerformanceHistoriesController(IPerformanceHistoryService service)
        {
            _service = service;
        }

        // Lấy danh sách lịch sử hiệu suất (lọc robotId) - UC 35: Generate Task Report & UC 40: Robot Performance Report (Task Management & Robot Handling)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PerformanceHistoryResponseDto>>> GetAll([FromQuery] ulong? robotId = null)
        {
            var histories = await _service.GetAllAsync(robotId);
            return Ok(histories);
        }

        // Lấy chi tiết lịch sử hiệu suất - UC 35: Generate Task Report (Task Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<PerformanceHistoryResponseDto>> GetById(ulong id)
        {
            var history = await _service.GetByIdAsync(id);
            if (history == null) return NotFound();
            return Ok(history);
        }

        // Tạo lịch sử hiệu suất (auto completion_date for test, integrate auto from task complete) - UC 35: Generate Task Report (Task Management)
        [HttpPost]
        public async Task<ActionResult<PerformanceHistoryResponseDto>> Create(PerformanceHistoryDto historyDto)
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
