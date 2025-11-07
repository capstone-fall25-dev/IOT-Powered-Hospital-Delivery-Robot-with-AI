using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PatientsController : ControllerBase
    {
        private readonly IPatientService _service;

        public PatientsController(IPatientService service)
        {
            _service = service;
        }

        // Lấy danh sách tất cả patient (include Room) 
        [HttpGet]
        [Authorize(Roles = "doctor")]
        public async Task<ActionResult<IEnumerable<PatientResponseDto>>> GetAll()
        {
            var patients = await _service.GetAllAsync();
            return Ok(patients);
        }

        // Lấy thông tin chi tiết patient (include Room/Prescriptions.Items) - UC 30: View Patient Profile (Patient Management)
        [HttpGet("{id}")]
        [Authorize(Roles = "doctor")]
        public async Task<ActionResult<PatientResponseDto>> GetById(ulong id)
        {
            var patient = await _service.GetByIdAsync(id);
            if (patient == null) return NotFound();
            return Ok(patient);
        }

        // Tạo patient mới (validate unique code) - UC 28: Create New Patient (Patient Management)
        [HttpPost]
        [Authorize(Roles = "doctor")]
        public async Task<ActionResult<PatientResponseDto>> Create(PatientDto patientDto)
        {
            try
            {
                var created = await _service.CreateAsync(patientDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật thông tin patient (validate unique code, room/department) - UC 29: Update Patient (Patient Management)
        [HttpPut("{id}")]
        [Authorize(Roles = "doctor")]
        public async Task<ActionResult<PatientResponseDto>> Update(ulong id, PatientDto patientDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, patientDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Discharge patient (set status="discharged", null RoomId/RoomNumber, log reason) - UC 32: Patient Discharge Management (Patient Management)
        [HttpPatch("{id}/discharge")]
        [Authorize(Roles = "doctor")]
        public async Task<ActionResult<PatientResponseDto>> Discharge(ulong id)
        {
            try
            {
                var updated = await _service.DischargeAsync(id);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Theo dõi lịch sử thuốc của bệnh nhân - UC 31: Track Patient Medicine History (Patient Management)
        [HttpGet("{id}/medicine-history")]
        [Authorize(Roles = "doctor")]
        public async Task<ActionResult<IEnumerable<PatientMedicineHistoryDto>>> GetMedicineHistory(ulong id)
        {
            try
            {
                var history = await _service.GetMedicineHistoryAsync(id);
                return Ok(history);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // UC 33: Generate Patient Reports (Patient Management)
        [HttpGet("{id}/report")]
        [Authorize(Roles = "doctor")]
        public async Task<ActionResult<PatientReportDto>> GetReport(ulong id)
        {
            try
            {
                var report = await _service.GetReportAsync(id);
                return Ok(report);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
