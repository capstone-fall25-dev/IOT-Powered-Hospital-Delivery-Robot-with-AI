/*using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
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

        // Lấy danh sách task (lọc theo priority) - UC 25: View Task History & UC 34: Task Priority Setting (Task Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetAll([FromQuery] string? priority = null)
        {
            var tasks = await _service.GetAllAsync(priority);
            return Ok(tasks);
        }

        // Lấy thông tin chi tiết task (include stops/compartments) - UC 25: View Task History & UC 27: Monitor Task Progress (Task Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskResponseDto>> GetById(ulong id)
        {
            var task = await _service.GetByIdAsync(id);
            if (task == null) return NotFound();
            return Ok(task);
        }

        // Lấy task theo user (assigned_by) - UC 25: View Task History (Task Management)
        [HttpGet("by-user/{userId}")]
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

        // Tạo task mới (auto tạo stops/compartments, set assigned_by = currentUser) - UC 21: Create Transport Task & UC 22: Doctor Creates Task by Prescription & UC 28: Assign Task to Robot (Task Management)
        [HttpPost]
        public async Task<ActionResult<TaskResponseDto>> Create(CreateTaskDto createTaskDto)
        {
            try
            {
                var currentUserId = GetCurrentUserId(); // Từ auth
                var created = await _service.CreateAsync(createTaskDto, currentUserId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật task (status/robot/priority) - UC 24: Update Task Status & UC 34: Task Priority Setting (Task Management)
        [HttpPut("{id}")]
        public async Task<ActionResult<TaskResponseDto>> Update(ulong id, TaskDto taskDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, taskDto);
                if (updated == null) return NotFound();
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

        // Hủy task (set status="canceled") - UC 26: Cancel Task (Task Management)
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

        // Submit task để admin confirm (log message) - UC 23: Submit Task Request (Task Management)
        [HttpPost("{id}/submit")]
        public async Task<ActionResult<TaskResponseDto>> Submit(ulong id, SubmitTaskDto submitDto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentUsername = GetCurrentUsername();

                var submitted = await _service.SubmitAsync(id, submitDto, currentUserId, currentUsername);
                return Ok(submitted);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Admin confirm task (set in_progress, log, alert low battery) - UC 23: Submit Task Request (Task Management)
        [HttpPost("{id}/confirm")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<TaskResponseDto>> Confirm(ulong id)
        {
            try
            {
                var adminUserId = GetCurrentUserId();
                var adminUsername = GetCurrentUsername();

                var confirmed = await _service.ConfirmAsync(id, adminUserId, adminUsername);
                return Ok(confirmed);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật tiến độ task (stop status, duration, auto-complete if all done) - UC 24: Update Task Status & UC 27: Monitor Task Progress & UC 31: Task Confirmation by Receiver (Task Management)
        [HttpPatch("{id}/progress")]
        public async Task<ActionResult<TaskResponseDto>> UpdateProgress(ulong id, UpdateProgressDto progressDto)
        {
            try
            {
                var updated = await _service.UpdateTaskProgressAsync(id, progressDto);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật priority task - UC 34: Task Priority Setting (Task Management)
        [HttpPatch("{id}/priority")]
        public async Task<ActionResult<TaskResponseDto>> SetPriority(ulong id, TaskPriorityDto priorityDto)
        {
            try
            {
                var updated = await _service.SetPriorityAsync(id, priorityDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Test scheduler - auto assign pending tasks to available robots (test cron job) - UC 33: Task Scheduling (Task Management)
        [HttpPost("schedule-pending")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<int>> SchedulePending()
        {
            var count = await _service.SchedulePendingTasksAsync();
            return Ok(new { AssignedCount = count, Message = $"Scheduled {count} pending tasks" });
        }

        // Tạo báo cáo nhiệm vụ (tổng/avg duration/lỗi theo robot, lọc ngày/robot) - UC 35: Generate Task Report (Task Management)
        [HttpGet("report")]
        public async Task<ActionResult<IEnumerable<TaskReportDto>>> GetTaskReport([FromQuery] ulong? robotId = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var reports = await _service.GetTaskReportAsync(robotId, startDate, endDate);
            return Ok(reports);
        }

        private ulong GetCurrentUserId()
        {
            return ulong.Parse(User.FindFirst("userId")?.Value ?? "1");
        }

        private string GetCurrentUsername()
        {
            return User.FindFirst("username")?.Value ?? "MemeTest";
        }
    }
}
*/