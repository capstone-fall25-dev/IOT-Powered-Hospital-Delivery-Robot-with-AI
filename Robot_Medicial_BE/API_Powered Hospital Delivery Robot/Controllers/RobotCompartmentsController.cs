using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý ngăn chứa của robot
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class RobotCompartmentsController : ControllerBase
    {
        private readonly IRobotCompartmentService _service;

        public RobotCompartmentsController(IRobotCompartmentService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy ngăn chứa theo danh mục và robot
        /// </summary>
        [HttpGet("category/{categoryId}/robot/{robotId}")]
        public async Task<IActionResult> GetByCategoryAndRobot(
            [FromRoute] ulong categoryId, 
            [FromRoute] ulong robotId)
        {
            var result = await _service.GetByCategoryAndRobotAsync(categoryId, robotId);
            if (!result.Any())
                return NotFound($"Không tìm thấy ngăn chứa thuộc danh mục ID = {categoryId} cho robot ID = {robotId}");

            return Ok(result);
        }

        /// <summary>
        /// Lấy toàn bộ ngăn chứa theo robot
        /// </summary>
        [HttpGet("robot/{robotId}")]
        public async Task<IActionResult> GetByRobot([FromRoute] ulong robotId)
        {
            var result = await _service.GetByRobotAsync(robotId);

            if (!result.Any())
                return NotFound($"Robot ID = {robotId} không có ngăn chứa nào được cấu hình.");

            return Ok(result);
        }

        /// <summary>
        /// Lấy tất cả ngăn chứa đã mở khóa (unlocked) của robot
        /// </summary>
        [HttpGet("robot/{robotId}/all")]
        public async Task<IActionResult> GetUnlockedCompartments(ulong robotId)
        {
            var result = await _service.GetFilteredByRobotAsync(robotId, null);
            return Ok(result);
        }

        /// <summary>
        /// Lấy ngăn chứa đã mở khóa và lọc theo danh mục
        /// </summary>
        [HttpGet("robot/{robotId}/category/{categoryId}")]
        public async Task<IActionResult> GetFilteredByCategory(
            ulong robotId, 
            ulong categoryId)
        {
            var result = await _service.GetFilteredByRobotAsync(robotId, categoryId);
            return Ok(result);
        }
    }
}