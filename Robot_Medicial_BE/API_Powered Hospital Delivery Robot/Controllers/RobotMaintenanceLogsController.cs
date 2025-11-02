using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RobotMaintenanceLogsController : ControllerBase
    {
        private readonly IRobotMaintenanceLogService _service;

        public RobotMaintenanceLogsController(IRobotMaintenanceLogService service)
        {
            _service = service;
        }

        // Lấy danh sách log bảo trì robot (lọc theo robotId) - UC 40: Robot Performance Report (Robot Handling)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RobotMaintenanceLogResponseDto>>> GetAll([FromQuery] ulong? robotId = null)
        {
            var logs = await _service.GetAllAsync(robotId);
            return Ok(logs);
        }

        // Lấy chi tiết log bảo trì - UC 40: Robot Performance Report (Robot Handling)
        [HttpGet("{id}")]
        public async Task<ActionResult<RobotMaintenanceLogResponseDto>> GetById(ulong id)
        {
            var log = await _service.GetByIdAsync(id);
            if (log == null) return NotFound();
            return Ok(log);
        }

        // Tạo log bảo trì mới (validate robot) - UC 40: Robot Performance Report (Robot Handling)
        [HttpPost]
        public async Task<ActionResult<RobotMaintenanceLogResponseDto>> Create(RobotMaintenanceLogDto logDto)
        {
            try
            {
                var created = await _service.CreateAsync(logDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
