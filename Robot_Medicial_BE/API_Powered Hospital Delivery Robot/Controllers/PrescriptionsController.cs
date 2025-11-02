using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrescriptionsController : ControllerBase
    {
        private readonly IPrescriptionService _service;

        public PrescriptionsController(IPrescriptionService service)
        {
            _service = service;
        }

        // Lấy danh sách đơn thuốc (lọc theo patientId/status) - UC 66: Track Patient Medicine History & UC 70: Generate Patient Reports (Patient Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PrescriptionResponseDto>>> GetAll([FromQuery] ulong? patientId = null, [FromQuery] string? status = null)
        {
            var prescriptions = await _service.GetAllAsync(patientId, status);
            return Ok(prescriptions);
        }

        // Lấy chi tiết đơn thuốc (include PatientName/UserEmail/Items) - UC 66: Track Patient Medicine History (Patient Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<PrescriptionResponseDto>> GetById(ulong id)
        {
            var prescription = await _service.GetByIdAsync(id);
            if (prescription == null) return NotFound();
            return Ok(prescription);
        }

        // Tạo đơn thuốc mới (auto add items, set user=currentUser) - UC 46: Create Prescription (Prescription Management)
        [HttpPost]
        public async Task<ActionResult<PrescriptionResponseDto>> Create(PrescriptionDto prescriptionDto)
        {
            try
            {
                var currentUserId = GetCurrentUserId(); // Từ auth
                var created = await _service.CreateAsync(prescriptionDto, currentUserId);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật status đơn thuốc (pending/approved/dispensed/canceled) - UC 47: Approve Prescription (Prescription Management)
        [HttpPatch("{id}/status/{status}")]
        public async Task<ActionResult<PrescriptionResponseDto>> UpdateStatus(ulong id, string status)
        {
            try
            {
                var updated = await _service.UpdateStatusAsync(id, status);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Thêm item vào đơn thuốc (validate stock) - UC 46: Create Prescription (Prescription Management)
        [HttpPost("{prescriptionId}/items")]
        public async Task<ActionResult<PrescriptionItemResponseDto>> AddItem(ulong prescriptionId, PrescriptionItemDto itemDto)
        {
            try
            {
                var created = await _service.AddItemAsync(prescriptionId, itemDto);
                return CreatedAtAction("GetItem", new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Assign đơn thuốc vào task (create TaskPatientAssignment, auto assign items to compartments) - UC 48: Dispatch Medicine via Robot (Prescription Management)
        [HttpPost("{prescriptionId}/assign-task/{taskId}")]
        public async Task<ActionResult<AssignPrescriptionResponseDto>> AssignToTask(ulong prescriptionId, ulong taskId)
        {
            try
            {
                var response = await _service.AssignToTaskAsync(prescriptionId, taskId);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        private ulong GetCurrentUserId()
        {
            return ulong.Parse(User.FindFirst("userId")?.Value ?? "1");
        }
    }
}
