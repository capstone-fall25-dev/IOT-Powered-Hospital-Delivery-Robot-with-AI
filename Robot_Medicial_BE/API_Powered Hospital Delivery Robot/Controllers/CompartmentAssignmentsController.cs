using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CompartmentAssignmentsController : ControllerBase
    {
        private readonly ICompartmentAssignmentService _service;

        public CompartmentAssignmentsController(ICompartmentAssignmentService service)
        {
            _service = service;
        }

        // Lấy danh sách assign ngăn chứa (lọc taskId/status) - UC 30: Multi-Destination Delivery (Task Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<CompartmentAssignmentResponseDto>>> GetAll([FromQuery] ulong? taskId = null, [FromQuery] string? status = null)
        {
            var assignments = await _service.GetAllAsync(taskId, status);
            return Ok(assignments);
        }

        // Lấy chi tiết assign ngăn chứa - UC 30: Multi-Destination Delivery (Task Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> GetById(ulong id)
        {
            var assignment = await _service.GetByIdAsync(id);
            if (assignment == null) return NotFound();
            return Ok(assignment);
        }

        // Tạo assign ngăn chứa cho task/stop/compartment - UC 28: Assign Task to Robot (Task Management)
        [HttpPost]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> Create(CompartmentAssignmentDto assignmentDto)
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

        // Cập nhật assign ngăn chứa (status/item_desc, validate not loaded) - UC 24: Update Task Status (Task Management)
        [HttpPut("{id}")]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> Update(ulong id, CompartmentAssignmentDto assignmentDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, assignmentDto);
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

        // Load item vào ngăn chứa (set status="loaded", validate pending/locked, log) - UC 48: Dispatch Medicine via Robot (Prescription Management)
        [HttpPatch("{id}/load")]
        public async Task<ActionResult<CompartmentAssignmentResponseDto>> Load(ulong id, LoadCompartmentDto loadDto)
        {
            try
            {
                var loaded = await _service.LoadAsync(id, loadDto);
                if (loaded == null) return NotFound();
                return Ok(loaded);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Bulk load items vào ngăn chứa cho task (validate match count, log) - UC 48: Dispatch Medicine via Robot (Prescription Management)
        [HttpPost("tasks/{taskId}/load-compartments")]
        public async Task<ActionResult<IEnumerable<CompartmentAssignmentResponseDto>>> BulkLoad(ulong taskId, List<LoadCompartmentDto> loadDtos)
        {
            try
            {
                var loaded = await _service.BulkLoadForTaskAsync(taskId, loadDtos);
                return Ok(loaded);
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
