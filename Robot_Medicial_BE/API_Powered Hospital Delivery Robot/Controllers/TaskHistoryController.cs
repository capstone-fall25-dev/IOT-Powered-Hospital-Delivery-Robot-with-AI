using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý lịch sử nhiệm vụ
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    public class TaskHistoryController : ControllerBase
    {
        private readonly ITaskHistoryService _service;

        public TaskHistoryController(ITaskHistoryService service)
            => _service = service;

        /// <summary>
        /// Lấy danh sách lịch sử nhiệm vụ (có phân trang và lọc)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PagedTaskHistoryDto>> GetHistory([FromQuery] TaskHistoryFilterDto filter)
        {
            var result = await _service.GetHistoryAsync(filter);
            return Ok(result);
        }

        /// <summary>
        /// Lấy chi tiết lịch sử nhiệm vụ theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<TaskHistoryResponseDto>> GetDetail(ulong id)
        {
            var result = await _service.GetDetailAsync(id);
            return result == null ? NotFound("Không tìm thấy lịch sử.") : Ok(result);
        }
    }
}
