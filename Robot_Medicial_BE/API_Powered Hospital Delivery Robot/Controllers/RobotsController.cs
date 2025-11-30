using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RobotsController : ControllerBase
    {
        private readonly IRobotService _service;

        public RobotsController(IRobotService service)
        {
            _service = service;
        }

        // Lấy danh sách tất cả robot (có thể lọc theo trạng thái: at_station, moving, charging...)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RobotResponseDto>>> GetAll([FromQuery] string? status = null)
        {
            var robots = await _service.GetAllAsync(status);
            return Ok(robots);
        }

        // Lấy chi tiết một robot theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<RobotResponseDto>> GetById(ulong id)
        {
            var robot = await _service.GetByIdAsync(id);
            if (robot == null) return NotFound();
            return Ok(robot);
        }

        // Tạo robot mới (dùng khi thêm robot vào hệ thống)
        [HttpPost]
        public async Task<ActionResult<RobotResponseDto>> Create(RobotDto robotDto)
        {
            try
            {
                var created = await _service.CreateAsync(robotDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, new
                {
                    message = "Tạo robot thành công.",
                    data = created
                });
            }
            catch (InvalidOperationException ex)
            {
                // lỗi như: Robot code already exists
                return Conflict(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                // lỗi như: Battery percent must be between 0 and 100
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                // lỗi không xác định
                return StatusCode(500, new
                {
                    message = "Lỗi hệ thống khi tạo robot.",
                    detail = ex.Message
                });
            }
        }

        // ROS2 gửi trạng thái robot (vị trí, trạng thái nhiệm vụ...) – không cần token
        [HttpPost("update-status")]
        public async Task<ActionResult> UpdateStatus([FromBody] RobotStatusUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateStatusAsync(dto);
                return Ok(new
                {
                    message = $"Đã cập nhật trạng thái robot '{dto.Code}' sang status '{dto.Status}' thành công.",
                    robot = updated
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // Cập nhật trạng thái robot từ web
        [HttpPatch("{id}/status")]
        public async Task<ActionResult<RobotResponseDto>> UpdateStatus(ulong id, [FromBody] UpdateStatusDto dto)
        {
            var updated = await _service.UpdateStatusAsync(id, dto);
            return updated == null
                ? NotFound(new { message = $"Không tìm thấy robot có ID = {id}." })
                : Ok(new { message = "Cập nhật trạng thái thành công.", data = updated });
        }

        // Gán bản đồ cho robot (khi triển khai ở tầng mới)
        [HttpPut("{robotId}/assign-map/{mapId}")]
        public async Task<ActionResult<AssignMapResponseDto>> AssignMap(ulong robotId, ulong mapId)
        {
            try
            {
                var result = await _service.AssignMapAsync(robotId, mapId);
                return Ok(new
                {
                    message = $"Đã gán bản đồ ID = {mapId} cho robot ID = {robotId}.",
                    data = result
                });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // Cập nhật vị trí robot (từ ROS2 hoặc điều khiển tay)
        [HttpPatch("{id}/position")]
        public async Task<ActionResult<RobotResponseDto>> UpdatePosition(ulong id, [FromBody] UpdatePositionDto dto)
        {
            var updated = await _service.UpdatePositionAsync(id, dto);
            return updated == null
                ? NotFound(new { message = $"Không tìm thấy robot có ID = {id}." })
                : Ok(new { message = "Cập nhật vị trí thành công.", data = updated });
        }

        // Chuyển robot sang chế độ điều khiển tay
        [HttpPatch("{id}/manual-control")]
        public async Task<ActionResult<RobotResponseDto>> ManualControl(ulong id)
        {
            var dto = new UpdateStatusDto { Status = "manual_control" };
            var updated = await _service.UpdateStatusAsync(id, dto);
            return updated == null
                ? NotFound(new { message = $"Không tìm thấy robot có ID = {id}." })
                : Ok(new { message = "Đã chuyển robot sang chế độ điều khiển tay.", data = updated });
        }

        // Lấy danh sách robot đang ở trạm (sẵn sàng nhận nhiệm vụ)
        [HttpGet("available")]
        public async Task<IActionResult> GetAvailableRobots()
        {
            var robots = await _service.GetAllAsync("at_station");
            return Ok(new
            {
                message = "Danh sách robot sẵn sàng nhận nhiệm vụ.",
                available_count = robots.Count(),
                data = robots
            });
        }

        // Chỉ sửa Tên + Danh sách loại ngăn chứa (CategoryId)
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRobot(ulong id, [FromBody] UpdateRobotDto dto)
        {
            if (dto == null)
                return BadRequest(new { message = "Dữ liệu cập nhật không được để trống" });

            if (dto.Compartments == null || !dto.Compartments.Any())
                return BadRequest(new { message = "Danh sách ngăn chứa không được để trống" });

            if (dto.Compartments.Count > 20) // tùy giới hạn robot của bạn
                return BadRequest(new { message = "Số lượng ngăn chứa không được vượt quá 20" });

            if (dto.Compartments.Any(c => c.CategoryId == 0))
                return BadRequest(new { message = "CategoryId không hợp lệ (phải > 0)." });

            try
            {
                var result = await _service.UpdateAsync(id, dto);
                return Ok(new
                {
                    success = true,
                    message = "Cập nhật thông tin robot thành công.",
                    data = result
                });
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("không tìm thấy"))
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("nhiệm vụ"))
            {
                return Conflict(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Lỗi hệ thống khi cập nhật robot.",
                    detail = ex.Message
                });
            }
        }
    }
}
