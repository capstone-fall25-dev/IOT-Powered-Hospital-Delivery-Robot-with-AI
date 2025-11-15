using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RobotsController : ControllerBase
    {
        private readonly IRobotService _service;

        public RobotsController(IRobotService service)
        {
            _service = service;
        }

        [HttpGet]
     //   [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<IEnumerable<RobotResponseDto>>> GetAll([FromQuery] string? status = null)
        {
            var robots = await _service.GetAllAsync(status);
            return Ok(robots);
        }

        [HttpGet("{id}")]
        //[Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<RobotResponseDto>> GetById(ulong id)
        {
            var robot = await _service.GetByIdAsync(id);
            if (robot == null) return NotFound();
            return Ok(robot);
        }

        
        // [Authorize(Roles = "admin")]
        [HttpPost]
        public async Task<ActionResult<RobotResponseDto>> Create(RobotDto robotDto)
        {
            try
            {
                var created = await _service.CreateAsync(robotDto);

                return CreatedAtAction(nameof(GetById),
                    new { id = created.Id },
                    created);
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
                    message = "Internal server error",
                    detail = ex.Message
                });
            }
        }


        // ✅ ROS gửi trạng thái (không cần token)
        [HttpPost("update-status")]
       // [AllowAnonymous]
        public async Task<ActionResult> UpdateStatus([FromBody] RobotStatusUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateStatusAsync(dto);
                return Ok(new
                {
                    message = $"✅ Updated robot '{dto.Code}' to status '{dto.Status}'",
                    robot = updated
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPatch("{id}/status")]
       // [Authorize(Roles = "admin, doctor")]
        public async Task<ActionResult<RobotResponseDto>> UpdateStatus(ulong id, UpdateStatusDto dto)
        {
            var updated = await _service.UpdateStatusAsync(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        [HttpPut("{robotId}/assign-map/{mapId}")]
      //  [Authorize(Roles = "admin")]
        public async Task<ActionResult<AssignMapResponseDto>> AssignMap(ulong robotId, ulong mapId)
        {
            var result = await _service.AssignMapAsync(robotId, mapId);
            return Ok(result);
        }

        [HttpPatch("{id}/position")]
        public async Task<ActionResult<RobotResponseDto>> UpdatePosition(ulong id, UpdatePositionDto dto)
        {
            var updated = await _service.UpdatePositionAsync(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        [HttpPatch("{id}/manual-control")]
     //   [Authorize(Roles = "doctor")]
        public async Task<ActionResult<RobotResponseDto>> ManualControl(ulong id)
        {
            var dto = new UpdateStatusDto { Status = "manual_control" };
            var updated = await _service.UpdateStatusAsync(id, dto);
            if (updated == null) return NotFound();
            return Ok(updated);
        }

        [HttpGet("available")]
        public async Task<IActionResult> GetAvailableRobots()
        {
            var robots = await _service.GetAllAsync("at_station");
            return Ok(robots);
        }

    }
}
