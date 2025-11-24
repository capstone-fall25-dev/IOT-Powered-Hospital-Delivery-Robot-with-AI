using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
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

        // Lấy danh sách nhật ký bảo trì (có thể lọc theo robot)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<RobotMaintenanceLogResponseDto>>> GetAll([FromQuery] ulong? robotId = null)
        {
            var logs = await _service.GetAllAsync(robotId);
            return Ok(new
            {
                total = logs.Count(),
                robotId,
                data = logs
            });
        }

        // Lấy chi tiết một bản ghi bảo trì theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<RobotMaintenanceLogResponseDto>> GetById(ulong id)
        {
            var log = await _service.GetByIdAsync(id);
            return log == null
                ? NotFound(new { message = $"Không tìm thấy nhật ký bảo trì có ID = {id}." })
                : Ok(log);
        }

        // Tạo mới nhật ký bảo trì (khi kỹ thuật viên bảo trì, thay pin, sửa chữa, vệ sinh robot...)
        [HttpPost]
        public async Task<ActionResult<RobotMaintenanceLogResponseDto>> Create([FromBody] RobotMaintenanceLogDto logDto)
        {
            try
            {
                var created = await _service.CreateAsync(logDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, new
                {
                    message = "Đã ghi nhận nhật ký bảo trì thành công.",
                    data = created
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}