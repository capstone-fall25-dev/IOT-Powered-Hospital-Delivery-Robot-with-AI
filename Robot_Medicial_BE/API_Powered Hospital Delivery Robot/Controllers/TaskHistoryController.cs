using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskHistoryController : ControllerBase
    {
        private readonly ITaskHistoryService _service;

        public TaskHistoryController(ITaskHistoryService service)
            => _service = service;

        [HttpGet]
        public async Task<ActionResult<PagedTaskHistoryDto>> GetHistory([FromQuery] TaskHistoryFilterDto filter)
        {
            var result = await _service.GetHistoryAsync(filter);
            return Ok(result);
        }
    }
}
