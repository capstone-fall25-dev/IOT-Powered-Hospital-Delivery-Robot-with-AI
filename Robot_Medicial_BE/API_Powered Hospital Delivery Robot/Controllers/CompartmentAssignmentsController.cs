using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý phân công ngăn chứa robot (gán thuốc vào khoang)
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize] 
    public class CompartmentAssignmentsController : ControllerBase
    {
        private readonly ICompartmentAssignmentService _service;

        public CompartmentAssignmentsController(ICompartmentAssignmentService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy danh sách phân khoang (có thể lọc theo nhiệm vụ và trạng thái)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CompartmentAssignmentResponseDto>>> GetAll(
            [FromQuery] ulong? taskId = null,
            [FromQuery] string? status = null)
        {
            var assignments = await _service.GetAllAsync(taskId, status);
            return Ok(assignments);
        }

        /// <summary>
        /// Lấy thông tin chi tiết một phân khoang theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> GetById(ulong id)
        {
            var assignment = await _service.GetByIdAsync(id);
            return assignment == null
                ? NotFound("Không tìm thấy phân khoang.")
                : Ok(assignment);
        }

        /// <summary>
        /// Tạo mới phân khoang (gán thuốc vào khoang robot)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> Create([FromBody] CompartmentAssignmentDto assignmentDto)
        {
            try
            {
                var created = await _service.CreateAsync(assignmentDto);
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

        /// <summary>
        /// Cập nhật thông tin phân khoang
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> Update(
            ulong id,
            [FromBody] CompartmentAssignmentDto assignmentDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, assignmentDto);
                return updated == null
                    ? NotFound("Không tìm thấy phân khoang để cập nhật.")
                    : Ok(updated);
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

        /// <summary>
        /// Xác nhận đã nạp thuốc vào khoang (khi nhân viên dược nạp thuốc cho robot)
        /// </summary>
        [HttpPatch("{id}/load")]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> Load(
            ulong id,
            [FromBody] LoadCompartmentDto loadDto)
        {
            try
            {
                var loaded = await _service.LoadAsync(id, loadDto);
                return loaded == null
                    ? NotFound("Không tìm thấy phân khoang để nạp thuốc.")
                    : Ok(loaded);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Nạp thuốc hàng loạt cho toàn bộ khoang của một nhiệm vụ
        /// </summary>
        [HttpPost("tasks/{taskId}/load-compartments")]
        public async Task<ActionResult<IEnumerable<CompartmentAssignmentResponseDto>>> BulkLoad(
            ulong taskId,
            [FromBody] List<LoadCompartmentDto> loadDtos)
        {
            try
            {
                var loaded = await _service.BulkLoadForTaskAsync(taskId, loadDtos);
                return Ok(new
                {
                    message = "Nạp thuốc cho toàn bộ khoang thành công.",
                    data = loaded
                });
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
    }
}