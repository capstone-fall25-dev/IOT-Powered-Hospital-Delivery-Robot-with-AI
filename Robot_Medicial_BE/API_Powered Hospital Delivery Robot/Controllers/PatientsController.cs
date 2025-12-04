using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý thông tin bệnh nhân
    /// </summary>
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class PatientsController : ControllerBase
    {
        private readonly IPatientService _service;

        public PatientsController(IPatientService service)
        {
            _service = service;
        }

        /// <summary>
        /// Lấy danh sách tất cả bệnh nhân
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PatientResponseDto>>> GetAll()
        {
            var patients = await _service.GetAllAsync();
            return Ok(patients);
        }

        /// <summary>
        /// Tìm kiếm và lọc bệnh nhân theo nhiều tiêu chí
        /// </summary>
        [HttpPost("filter")]
        public async Task<ActionResult<IEnumerable<PatientResponseDto>>> Filter([FromBody] PatientFilterDto filter)
        {
            var patients = await _service.FilterAsync(filter);
            return Ok(patients);
        }

        /// <summary>
        /// Lấy thông tin chi tiết bệnh nhân theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<PatientResponseDto>> GetById(ulong id)
        {
            var patient = await _service.GetByIdAsync(id);
            return patient == null
                ? NotFound("Không tìm thấy bệnh nhân.")
                : Ok(patient);
        }

        /// <summary>
        /// Tạo mới bệnh nhân (nhập viện)
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<PatientResponseDto>> Create([FromBody] PatientCreateDto dto)
        {
            try
            {
                var created = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Cập nhật thông tin bệnh nhân
        /// </summary>
        [HttpPut("{id}")]
        public async Task<ActionResult<PatientResponseDto>> Update(ulong id, [FromBody] PatientUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                return updated == null
                    ? NotFound("Không tìm thấy bệnh nhân để cập nhật.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Xuất viện cho bệnh nhân
        /// </summary>
        [HttpPatch("{id}/discharge")]
        public async Task<ActionResult<PatientResponseDto>> Discharge(ulong id, [FromBody] DischargeDto dto)
        {
            try
            {
                var updated = await _service.DischargeAsync(id, dto.Reason);
                return updated == null
                    ? NotFound("Không tìm thấy bệnh nhân để xuất viện.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        /// <summary>
        /// Lấy lịch sử nhận thuốc của bệnh nhân (liên quan đến đơn thuốc và robot giao)
        /// </summary>
        [HttpGet("{id}/medicine-history")]
        public async Task<IActionResult> MedicineHistory(ulong id)
        {
            try
            {
                var history = await _service.GetMedicineHistoryAsync(id);
                return Ok(history);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        /// <summary>
        /// Lấy báo cáo tổng hợp tình trạng bệnh nhân (dùng cho bác sĩ)
        /// </summary>
        [HttpGet("{id}/report")]
        public async Task<IActionResult> Report(ulong id)
        {
            try
            {
                var report = await _service.GetReportAsync(id);
                return Ok(report);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        /// <summary>
        /// Lấy danh sách bệnh nhân có đơn thuốc đã được duyệt
        /// </summary>
        [HttpGet("with-approved-prescription")]
        public async Task<ActionResult<IEnumerable<PatientResponseDto>>> GetPatientsWithApprovedPrescription()
        {
            var patients = await _service.GetPatientsWithApprovedPrescriptionAsync();
            return Ok(patients);
        }
    }
}