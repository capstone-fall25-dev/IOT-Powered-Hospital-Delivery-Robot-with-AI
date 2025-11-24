using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize] 
    public class PrescriptionsController : ControllerBase
    {
        private readonly IPrescriptionService _presService;
        private readonly IPrescriptionItemService _itemService;

        public PrescriptionsController(
            IPrescriptionService presService,
            IPrescriptionItemService itemService)
        {
            _presService = presService;
            _itemService = itemService;
        }

        // ==================== ĐƠN THUỐC (PRESCRIPTION) ====================

        // Lấy danh sách đơn thuốc (có thể lọc theo bệnh nhân và trạng thái)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PrescriptionResponseDto>>> GetAll(
            [FromQuery] ulong? patientId,
            [FromQuery] string? status)
        {
            var prescriptions = await _presService.GetAllAsync(patientId, status);
            return Ok(prescriptions);
        }

        // Lấy chi tiết một đơn thuốc theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<PrescriptionResponseDto>> GetById(ulong id)
        {
            var result = await _presService.GetByIdAsync(id);
            return result == null
                ? NotFound("Không tìm thấy đơn thuốc.")
                : Ok(result);
        }

        // Tạo đơn thuốc mới
        [HttpPost]
        public async Task<ActionResult<PrescriptionResponseDto>> Create([FromBody] PrescriptionCreateDto dto)
        {
            try
            {
                var created = await _presService.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật thông tin đơn thuốc
        [HttpPut("{id}")]
        public async Task<ActionResult<PrescriptionResponseDto>> Update(ulong id, [FromBody] PrescriptionUpdateDto dto)
        {
            try
            {
                var updated = await _presService.UpdateAsync(id, dto);
                return updated == null
                    ? NotFound("Không tìm thấy đơn thuốc để cập nhật.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Xóa mềm đơn thuốc (đánh dấu IsDeleted = true)
        [HttpDelete("{id}")]
        public async Task<IActionResult> SoftDelete(ulong id)
        {
            try
            {
                await _presService.SoftDeleteAsync(id);
                return Ok(new { message = "Đã xóa đơn thuốc (xóa mềm)." });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // Khôi phục đơn thuốc đã xóa mềm
        [HttpPatch("{id}/restore")]
        public async Task<IActionResult> Restore(ulong id)
        {
            try
            {
                await _presService.RestoreAsync(id);
                return Ok(new { message = "Đã khôi phục đơn thuốc thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }

        // ==================== CHI TIẾT THUỐC TRONG ĐƠN (PRESCRIPTION ITEM) ====================

        // Thêm thuốc vào đơn (nhiều mục)
        [HttpPost("{id}/items")]
        public async Task<IActionResult> AddItem(ulong id, [FromBody] PrescriptionItemCreateDto dto)
        {
            try
            {
                dto.PrescriptionId = id;
                var item = await _itemService.CreateAsync(dto);
                return Ok(new
                {
                    message = "Thêm thuốc vào đơn thành công.",
                    item
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật một mục thuốc trong đơn (số lượng, liều dùng,...)
        [HttpPut("items/{itemId}")]
        public async Task<IActionResult> UpdateItem(ulong itemId, [FromBody] PrescriptionItemUpdateDto dto)
        {
            try
            {
                var updated = await _itemService.UpdateAsync(itemId, dto);
                return updated == null
                    ? NotFound("Không tìm thấy mục thuốc để cập nhật.")
                    : Ok(new { message = "Cập nhật thuốc thành công.", item = updated });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Xóa một mục thuốc khỏi đơn
        [HttpDelete("items/{itemId}")]
        public async Task<IActionResult> DeleteItem(ulong itemId)
        {
            try
            {
                await _itemService.DeleteAsync(itemId);
                return Ok(new { message = "Đã xóa thuốc khỏi đơn." });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
        }
    }
}