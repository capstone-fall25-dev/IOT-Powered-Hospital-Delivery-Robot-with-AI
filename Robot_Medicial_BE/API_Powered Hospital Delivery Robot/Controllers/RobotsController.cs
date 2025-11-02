using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
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

        [HttpGet("get-all")]
        public async Task<ActionResult<IEnumerable<RobotResponseDto>>> GetAll([FromQuery] string? status = null)
        {
            var robots = await _service.GetAllAsync(status);
            return Ok(robots);
        }

        [HttpGet("detail/{id}")]
        public async Task<ActionResult<RobotResponseDto>> GetById(ulong id)
        {
            var robot = await _service.GetByIdAsync(id);
            if (robot == null)
            {
                return NotFound($"Không tìm thấy robot {id}");
            }
            return Ok(robot);
        }

        [HttpPost("add")]
        public async Task<ActionResult<RobotResponseDto>> CreateRobot(RobotDto robotDto)
        {
            try
            {
                var created = await _service.CreateAsync(robotDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
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

        [HttpPatch("{id}/status")]
        public async Task<ActionResult<RobotResponseDto>> UpdateStatus(ulong id, UpdateStatusDto statusDto)
        {
            try
            {
                var updated = await _service.UpdateStatusAsync(id, statusDto);
                if (updated == null)
                {
                    return NotFound($"Không thể cập nhật trạng thái. Robot với ID {id} không tồn tại");
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

        [HttpPatch("{id}/location")]
        public async Task<ActionResult<RobotResponseDto>> UpdateLocation(ulong id, [FromBody] UpdateLocationDto locationDto)
        {
            try
            {
                var updated = await _service.UpdateLocationAsync(id, locationDto);
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, "Lỗi server: " + ex.Message);
            }
        }
    }
}
