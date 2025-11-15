using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
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

        // GET ALL
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PatientResponseDto>>> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        // FILTER
        [HttpPost("filter")]
        public async Task<ActionResult<IEnumerable<PatientResponseDto>>> Filter(PatientFilterDto filter)
        {
            return Ok(await _service.FilterAsync(filter));
        }

        // GET BY ID
        [HttpGet("{id}")]
        public async Task<ActionResult<PatientResponseDto>> GetById(ulong id)
        {
            var res = await _service.GetByIdAsync(id);
            return res == null ? NotFound() : Ok(res);
        }

        // CREATE
        [HttpPost]
        public async Task<ActionResult> Create(PatientCreateDto dto)
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

        // UPDATE
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(ulong id, PatientUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, dto);
                return updated == null ? NotFound() : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DISCHARGE
        [HttpPatch("{id}/discharge")]
        public async Task<ActionResult<PatientResponseDto>> Discharge(ulong id, [FromBody] DischargeDto dto)
        {
            var updated = await _service.DischargeAsync(id, dto.Reason);
            if (updated == null) return NotFound();

            return Ok(updated);
        }

        // MEDICINE HISTORY
        [HttpGet("{id}/medicine-history")]
        public async Task<ActionResult> History(ulong id)
        {
            return Ok(await _service.GetMedicineHistoryAsync(id));
        }

        // REPORT
        [HttpGet("{id}/report")]
        public async Task<ActionResult> Report(ulong id)
        {
            return Ok(await _service.GetReportAsync(id));
        }
    }
}
