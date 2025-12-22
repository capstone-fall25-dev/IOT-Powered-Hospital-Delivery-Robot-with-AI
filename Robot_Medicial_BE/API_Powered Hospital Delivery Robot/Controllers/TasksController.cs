using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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
        /// Chỉ hiển thị nhiệm vụ của user hiện tại, trừ admin có thể xem tất cả
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskListItemDto>>> GetAll(
            [FromQuery] ulong? robotId,
            [FromQuery] string? status,
            [FromQuery] string? priority)
        {
            var currentUserId = GetCurrentUserId();
            var currentUserRole = GetCurrentUserRole();
            
            var filter = new TaskFilterDto
            {
                RobotId = robotId,
                Status = status,
                Priority = priority
            };

            var data = await _service.GetAllAsync(filter, currentUserId, currentUserRole);
            return Ok(data);
        }

        /// <summary>
        /// Lấy chi tiết một nhiệm vụ theo ID
        /// Chỉ user tạo task hoặc admin mới có quyền xem
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskDetailDto>> GetById(ulong id)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentUserRole = GetCurrentUserRole();
                var result = await _service.GetByIdAsync(id, currentUserId, currentUserRole);
                return result == null
                    ? NotFound("Không tìm thấy nhiệm vụ.")
                    : Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message }); // 403 Forbidden - không có quyền, không phải token invalid
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
        /// Chỉ user tạo task hoặc admin mới có quyền xem/sửa
        /// </summary>
        [HttpGet("{id}/edit")]
        public async Task<ActionResult<TaskEditDto>> GetEditData(ulong id)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentUserRole = GetCurrentUserRole();
                var task = await _service.GetEditDataAsync(id, currentUserId, currentUserRole);
                return task == null
                    ? NotFound("Không tìm thấy nhiệm vụ.")
                    : Ok(task);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message }); // 403 Forbidden - không có quyền, không phải token invalid
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentUserRole = GetCurrentUserRole();
                var info = await _service.GetRunInfoAsync(taskId, currentUserId, currentUserRole);
                return info == null
                    ? NotFound("Nhiệm vụ không tồn tại.")
                    : Ok(info);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message }); // 403 Forbidden - không có quyền, không phải token invalid
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
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
            try
            {
                var result = await _service.CompleteTaskAsync(taskId);
                return result.Success
                    ? Ok(result.Task)
                    : BadRequest(new { message = result.Message });
            }
            catch (Exception ex)
            {
                // Log inner exception nếu có để debug
                string errorMessage = ex.Message;
                if (ex.InnerException != null)
                {
                    errorMessage += $" | Inner: {ex.InnerException.Message}";
                }
                return BadRequest(new { message = errorMessage });
            }
        }

        /// <summary>
        /// Bắt đầu nhiệm vụ
        /// </summary>
        [HttpPost("{taskId}/start")]
        public async Task<ActionResult<TaskResponseDto>> StartTask(ulong taskId)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentUserRole = GetCurrentUserRole();
                var result = await _service.StartTaskAsync(taskId, currentUserId, currentUserRole);
                return result == null ? NotFound("Không tìm thấy nhiệm vụ.") : Ok(result);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message }); // 403 Forbidden - không có quyền, không phải token invalid
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
        /// Kiểm tra robot có task pending không
        /// </summary>
        [HttpGet("check-robot-pending/{robotId}")]
        public async Task<ActionResult<bool>> CheckRobotPendingTask(ulong robotId)
        {
            var hasPending = await _service.HasRobotPendingTaskAsync(robotId);
            return Ok(hasPending);
        }

        /// <summary>
        /// Lấy ID của nhân viên hiện tại từ token
        /// </summary>
        private ulong GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(claim =>
                claim.Type == ClaimTypes.NameIdentifier ||
                claim.Type == "userId" ||
                claim.Type == "sub" ||
                claim.Type == "id");

            if (userIdClaim == null || !ulong.TryParse(userIdClaim.Value, out ulong userId))
                return 1;

            return userId;
        }

        /// <summary>
        /// Lấy role của nhân viên hiện tại từ token
        /// </summary>
         private string GetCurrentUserRole()
        {
            var roleClaim = User.FindFirst(claim =>
                claim.Type == ClaimTypes.Role ||
                claim.Type == "role");

            return roleClaim?.Value ?? "pharmacist"; // Default role nếu không tìm thấy
        }
    }
}
