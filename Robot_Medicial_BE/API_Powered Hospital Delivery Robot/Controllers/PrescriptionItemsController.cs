using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PrescriptionItemsController : ControllerBase
    {
        private readonly IPrescriptionItemService _service;

        public PrescriptionItemsController(IPrescriptionItemService service)
        {
            _service = service;
        }

        // Lấy danh sách item đơn thuốc (lọc prescriptionId/medicineId) 
        [HttpGet]
     //   [Authorize]
        public async Task<ActionResult<IEnumerable<PrescriptionItemResponseDto>>> GetAll([FromQuery] ulong? prescriptionId = null, [FromQuery] ulong? medicineId = null)
        {
            var items = await _service.GetAllAsync(prescriptionId, medicineId);
            return Ok(items);
        }

        // Lấy chi tiết item đơn thuốc 
        [HttpGet("{id}")]
     //   [Authorize]
        public async Task<ActionResult<PrescriptionItemResponseDto>> GetById(ulong id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        // Tạo item đơn thuốc (validate stock) 
        [HttpPost]
      //  [Authorize]
        public async Task<ActionResult<PrescriptionItemResponseDto>> Create(PrescriptionItemDto itemDto)
        {
            try
            {
                var created = await _service.CreateAsync(itemDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật item đơn thuốc (quantity/dosage) 
        [HttpPut("{id}")]
      //  [Authorize]
        public async Task<ActionResult<PrescriptionItemResponseDto>> Update(ulong id, PrescriptionItemDto itemDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, itemDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Báo cáo item thuốc hỏng (append instructions, auto alert high/manual) 
        [HttpPatch("{id}/damaged")]
      //  [Authorize]
        public async Task<ActionResult<ReportDamagedMedicineResponseDto>> ReportDamaged(ulong id, ReportDamagedMedicineDto damagedDto)
        {
            try
            {
                // Note: id from route is prescriptionItemId, but DTO also has it for validation
                if (id != damagedDto.PrescriptionItemId)
                {
                    return BadRequest("Route id must match DTO PrescriptionItemId");
                }
                var response = await _service.ReportDamagedAsync(id, damagedDto);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}