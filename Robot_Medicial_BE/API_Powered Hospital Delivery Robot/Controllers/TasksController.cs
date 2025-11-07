using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

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

        // Lấy danh sách task (lọc theo priority) - UC 12: View Task History (Task Management)
        [HttpGet]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<IEnumerable<TaskResponseDto>>> GetAll([FromQuery] string? priority = null)
        {
            var tasks = await _service.GetAllAsync(priority);
            return Ok(tasks);
        }

        // Lấy thông tin chi tiết task (include stops/compartments)
        [HttpGet("{id}")]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<TaskResponseDto>> GetById(ulong id)
        {
            var task = await _service.GetByIdAsync(id);
            if (task == null) return NotFound();
            return Ok(task);
        }

        // Lấy task theo user 
        [HttpGet("by-user/{userId}")]
        [Authorize(Roles = "admin, doctor")]
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

        // Tạo task mới (auto tạo stops/compartments, set assigned_by = currentUser) - UC 10: Creates Task by Prescription (Task Management) %Có 1 api tạo task ở PrescriptionsController%
        [HttpPost]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<TaskResponseDto>> Create(CreateTaskDto createTaskDto)
        {
            try
            {
                var currentUserId = GetCurrentUserId(); 
                var created = await _service.CreateAsync(createTaskDto, currentUserId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật task (status/robot/priority) - UC 11: Update Task Status (Task Management)
        [HttpPut("{id}")]
        [Authorize(Roles = "admin, doctor")]
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

        // Hủy task (set status="canceled") - UC 13: Cancel Task (Task Management)
        [HttpDelete("cancel/{id}")]
        [Authorize(Roles = "admin, doctor")]
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

        // Submit task để admin confirm (log message) 
        [HttpPost("{id}/submit")]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<TaskResponseDto>> Submit(ulong id, SubmitTaskDto submitDto)
        {
            try
            {
                var currentUserId = GetCurrentUserId();
                var currentUsername = GetCurrentFullname();

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

        // Admin confirm task (set in_progress, log, alert low battery)
        [HttpPost("{id}/confirm")]
        [Authorize(Roles = "admin")]
        public async Task<ActionResult<TaskResponseDto>> Confirm(ulong id)
        {
            try
            {
                var adminUserId = GetCurrentUserId();
                var adminUsername = GetCurrentFullname();

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

        // Cập nhật tiến độ task (stop status, duration, auto-complete if all done) - UC 14: Task Confirmation by Receiver (Task Management)
        [HttpPatch("{id}/progress")]
        [Authorize(Roles = "admin, doctor")]
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

        // Cập nhật priority task 
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

        // Test scheduler - auto assign pending tasks to available robots (test cron job)
        [HttpPost("schedule-pending")]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<int>> SchedulePending()
        {
            var count = await _service.SchedulePendingTasksAsync();
            return Ok(new { AssignedCount = count, Message = $"Scheduled {count} pending tasks" });
        }

        // Tạo báo cáo nhiệm vụ (tổng/avg duration/lỗi theo robot, lọc ngày/robot) - UC 15: Generate Task Report (Task Management)
        [HttpGet("report")]
        [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<IEnumerable<TaskReportDto>>> GetTaskReport([FromQuery] ulong? robotId = null, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
        {
            var reports = await _service.GetTaskReportAsync(robotId, startDate, endDate);
            return Ok(reports);
        }

        private ulong GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (claim == null) throw new UnauthorizedAccessException("User ID not found in token");
            return ulong.Parse(claim.Value);
        }

        private string GetCurrentFullname()
        {
            var claim = User.FindFirst("FullName");
            if (claim == null) throw new UnauthorizedAccessException("Fullname not found in token");
            return claim.Value;
        }
    }
}
