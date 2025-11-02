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

        // Lấy danh sách robot (lọc theo status) - UC 39: Track Robot Status (Robot Handling)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RobotResponseDto>>> GetAll([FromQuery] string? status = null)
        {
            var robots = await _service.GetAllAsync(status);
            return Ok(robots);
        }

        // Lấy thông tin chi tiết robot (include compartments/tasks) - UC 39: Track Robot Status (Robot Handling)
        [HttpGet("{id}")]
        public async Task<ActionResult<RobotResponseDto>> GetById(ulong id)
        {
            var robot = await _service.GetByIdAsync(id);
            if (robot == null) return NotFound();
            // Nếu có MapId, load map và tính position relative (thêm vào DTO nếu cần)
            if (robot.MapId.HasValue)
            {
                //var map = await _mapService.GetByIdAsync(robot.MapId.Value);
                // var (x, y) = _service.CalculatePositionOnMap(robot, map);
                // robot.PositionOnMap = new { X = x, Y = y }; // Extend DTO nếu cần
            }
            return Ok(robot); // Include Compartments & Tasks
        }

        // Tạo robot mới (default status="completed") - UC 39: Track Robot Status (Robot Handling)
        [HttpPost]
        public async Task<ActionResult<RobotResponseDto>> Create(RobotDto robotDto)
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

        // Cập nhật status robot (validate enum, no offline update) - UC 36: Manual Control Mode Activation & UC 37: Auto Switch to Manual Control (Robot Handling)
        [HttpPatch("{id}/status")]
        public async Task<ActionResult<RobotResponseDto>> UpdateStatus(ulong id, UpdateStatusDto statusDto)
        {
            try
            {
                var updated = await _service.UpdateStatusAsync(id, statusDto);
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

        // Assign map cho robot (check no active task, log) - UC 51: Manage Hospital Map (Map Management)
        [HttpPut("{robotId}/assign-map/{mapId}")]
        public async Task<ActionResult<AssignMapResponseDto>> AssignMap(ulong robotId, ulong mapId)
        {
            try
            {
                var response = await _service.AssignMapAsync(robotId, mapId);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật vị trí robot (latitude/longitude, heartbeat) - UC 39: Track Robot Status & UC 57: Track Robot Movement on Map (Robot Handling & Map Management)
        [HttpPatch("{id}/position")]
        public async Task<ActionResult<RobotResponseDto>> UpdatePosition(ulong id, UpdatePositionDto positionDto)
        {
            try
            {
                var updated = await _service.UpdatePositionAsync(id, positionDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
