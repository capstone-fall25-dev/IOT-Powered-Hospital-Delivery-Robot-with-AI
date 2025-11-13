using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _service;
        public TasksController(ITaskService service) => _service = service;

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetAll([FromQuery] ulong? robotId, [FromQuery] string? status, [FromQuery] string? priority)
        {
            var filter = new TaskFilterDto { RobotId = robotId, Status = status, Priority = priority };
            var data = await _service.GetAllAsync(filter);
            return Ok(data);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<TaskResponseDto>> GetById(ulong id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null ? NotFound("Không tìm thấy nhiệm vụ.") : Ok(result);
        }

        [HttpPost]
        public async Task<ActionResult<TaskResponseDto>> Create([FromBody] CreateTaskDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto, GetCurrentUserId());
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<TaskResponseDto>> Update(ulong id, [FromBody] UpdateTaskDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                return updated == null ? NotFound() : Ok(updated);
            }
            catch (Exception ex) { return BadRequest(ex.Message); }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(ulong id)
        {
            var ok = await _service.DeleteAsync(id);
            return ok ? Ok("Đã xoá nhiệm vụ.") : NotFound("Không tìm thấy nhiệm vụ để xoá.");
        }

        private ulong GetCurrentUserId()
        {
            return ulong.Parse(User.FindFirst("userId")?.Value ?? "1");
        }
    }
}
