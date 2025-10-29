using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _service;

        public TasksController(ITaskService service)
        {
            _service = service;
        }

        [HttpGet("get-all")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetAll()
        {
            var tasks = await _service.GetAllAsync();
            return Ok(tasks);
        }

        [HttpGet("detail/{id}")]
        public async Task<ActionResult<TaskResponseDto>> GetById(ulong id)
        {
            var task = await _service.GetByIdAsync(id);
            if (task == null)
            {
                return NotFound($"Không tìm thấy nhiệm vụ {id}");
            }
            return Ok(task);
        }

        [HttpGet("assign-by-user/{userId}")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetByUser(ulong userId)
        {
            try
            {
                var tasks = await _service.GetByAssignedByAsync(userId);
                return Ok(tasks);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("create")]
        public async Task<ActionResult<TaskResponseDto>> Create(TaskDto taskDto)
        {
            try
            {
                var created = await _service.CreateAsync(taskDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("update-or-change/{id}")]
        public async Task<ActionResult<TaskResponseDto>> Update(ulong id, TaskDto taskDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, taskDto);
                if (updated == null)
                {
                    return NotFound("Không tìm thấy nhiệm vụ để cập nhật");
                }
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("cancel/{id}")]
        public async Task<IActionResult> Delete(ulong id)
        {
            try
            {
                var success = await _service.DeleteAsync(id);
                if (success == false)
                {
                    return NotFound("Không tìm thấy nhiệm vụ để hủy");
                }
                return Ok("Hủy thành công");
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
