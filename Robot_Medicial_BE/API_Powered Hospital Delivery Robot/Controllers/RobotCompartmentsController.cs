using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RobotCompartmentsController : ControllerBase
    {
        private readonly IRobotCompartmentService _service;

        public RobotCompartmentsController(IRobotCompartmentService service)
        {
            _service = service;
        }

        [HttpGet("category/{categoryId}/robot/{robotId}")]
        public async Task<IActionResult> GetByCategoryAndRobot([FromRoute] ulong categoryId, [FromRoute] ulong robotId)
        {
            var result = await _service.GetByCategoryAndRobotAsync(categoryId, robotId);
            if (!result.Any())
                return NotFound($"Không tìm thấy ngăn chứa thuộc danh mục ID = {categoryId} cho robot ID = {robotId}");

            return Ok(result);
        }

        // Lấy toàn bộ ngăn chứa theo robot
        [HttpGet("robot/{robotId}")]
        public async Task<IActionResult> GetByRobot([FromRoute] ulong robotId)
        {
            var result = await _service.GetByRobotAsync(robotId);

            if (!result.Any())
                return NotFound($"Robot ID = {robotId} không có compartment nào.");

            return Ok(result);
        }

        // ==== API MỚI DÙNG CHO TẠO TASK ====

        // Lấy tất cả compartment unlocked của robot
        [HttpGet("robot/{robotId}/all")]
        public async Task<IActionResult> GetUnlockedCompartments(ulong robotId)
        {
            var result = await _service.GetFilteredByRobotAsync(robotId, null);
            return Ok(result);
        }

        // Lấy compartment unlocked + filter category
        [HttpGet("robot/{robotId}/category/{categoryId}")]
        public async Task<IActionResult> GetFilteredByCategory(
            ulong robotId, ulong categoryId)
        {
            var result = await _service.GetFilteredByRobotAsync(robotId, categoryId);
            return Ok(result);
        }
    }
}