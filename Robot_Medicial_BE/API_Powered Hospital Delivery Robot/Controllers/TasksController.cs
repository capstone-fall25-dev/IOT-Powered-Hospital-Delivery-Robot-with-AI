using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý nhiệm vụ giao hàng của robot
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class TasksController : ControllerBase
    {
        private readonly ITaskService _service;

        public TasksController(ITaskService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy danh sách nhiệm vụ (có thể lọc theo robot, trạng thái, độ ưu tiên)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskListItemDto>>> GetAll(
            [FromQuery] ulong? robotId,
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            var filter = new TaskFilterDto
            {
                RobotId = robotId,
                Status = status,
                Priority = priority
            };

            var data = await _service.GetAllAsync(filter);
            return Ok(data);
        }

        /// <summary>
        /// Lấy chi tiết một nhiệm vụ theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskDetailDto>> GetById(ulong id)
        {
            var result = await _service.GetByIdAsync(id);
            return result == null
                ? NotFound("Không tìm thấy nhiệm vụ.")
                : Ok(result);
        }

        /// <summary>
        /// Tạo nhiệm vụ mới
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<TaskResponseDto>> Create([FromBody] CreateTaskDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .SelectMany(x => x.Value!.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(string.Join(" ", errors));
            }

            try
            {
                var created = await _service.CreateAsync(dto, GetCurrentUserId());
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Lấy dữ liệu để chỉnh sửa nhiệm vụ
        /// </summary>
        [HttpGet("{id}/edit")]
        public async Task<ActionResult<TaskEditDto>> GetEditData(ulong id)
        {
            var task = await _service.GetEditDataAsync(id);
            return task == null
                ? NotFound("Không tìm thấy nhiệm vụ.")
                : Ok(task);
        }

        /// <summary>
        /// Cập nhật thông tin nhiệm vụ
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<TaskResponseDto>> Update(ulong id, [FromBody] UpdateTaskDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                return updated == null ? NotFound("Không tìm thấy nhiệm vụ.") : Ok(updated);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Xóa nhiệm vụ
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(ulong id)
        {
            var success = await _service.DeleteAsync(id);
            return success
                ? Ok("Đã xóa nhiệm vụ thành công.")
                : NotFound("Không tìm thấy nhiệm vụ để xóa.");
        }

        /// <summary>
        /// Thay đổi trạng thái nhiệm vụ (dành cho robot hoặc nhân viên)
        /// </summary>
        [HttpPut("{id}/status")]
        public async Task<ActionResult<TaskResponseDto>> ChangeStatus(ulong id, [FromBody] TaskStatusChangeDto dto)
        {
            try
            {
                var update = new UpdateTaskDto { Status = dto.Status };
                var result = await _service.UpdateAsync(id, update);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Lấy thông tin chạy nhiệm vụ (vị trí hiện tại, tiến độ)
        /// </summary>
        [HttpGet("{taskId}/run-info")]
        public async Task<ActionResult<RunTaskInfoDto>> GetRunInfo(ulong taskId)
        {
            var info = await _service.GetRunInfoAsync(taskId);
            return info == null
                ? NotFound("Nhiệm vụ không tồn tại.")
                : Ok(info);
        }

        /// <summary>
        /// Cập nhật trạng thái của một điểm dừng trong nhiệm vụ
        /// </summary>
        [HttpPut("{taskId}/stops/{stopId}/status")]
        public async Task<IActionResult> UpdateStopStatus(
            ulong taskId,
            ulong stopId,
            [FromBody] StopStatusChangeDto dto)
        {
            await _service.UpdateStopStatusAsync(taskId, stopId, dto.Status);
            return Ok(new { message = "Cập nhật trạng thái điểm dừng thành công." });
        }

        /// <summary>
        /// Hoàn thành nhiệm vụ (khi robot đã giao xong tất cả điểm dừng)
        /// </summary>
        [HttpPut("{taskId}/complete")]
        public async Task<IActionResult> CompleteTask(ulong taskId)
        {
            var result = await _service.CompleteTaskAsync(taskId);
            return result.Success
                ? Ok(result.Task)
                : BadRequest(result.Message);
        }

        /// <summary>
        /// Bắt đầu nhiệm vụ
        /// </summary>
        [HttpPost("{taskId}/start")]
        public async Task<ActionResult<TaskResponseDto>> StartTask(ulong taskId)
        {
            try
            {
                var result = await _service.StartTaskAsync(taskId);
                return result == null ? NotFound("Không tìm thấy nhiệm vụ.") : Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Hủy nhiệm vụ (giải phóng compartments, đưa robot về trạm, lưu vào database)
        /// </summary>
        [HttpPost("{taskId}/cancel")]
        public async Task<ActionResult<TaskResponseDto>> CancelTask(ulong taskId, [FromBody] CancelTaskDto? dto = null)
        {
            try
            {
                var result = await _service.CancelTaskAsync(taskId, dto?.Reason);
                return result == null 
                    ? NotFound("Không tìm thấy nhiệm vụ.") 
                    : Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Lấy ID của nhân viên hiện tại từ token
        /// </summary>
        private ulong GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("userId")?.Value;
            return ulong.TryParse(userIdClaim, out var id) ? id : 1;
        }
    }
}