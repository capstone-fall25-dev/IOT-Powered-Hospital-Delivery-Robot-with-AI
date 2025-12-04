using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    /// <summary>
    /// Quản lý đơn thuốc và chi tiết thuốc trong đơn
    /// </summary>
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

        // ==================== ĐƠN THUỐC ====================

        /// <summary>
        /// Lấy danh sách đơn thuốc (có thể lọc theo bệnh nhân và trạng thái)
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PrescriptionResponseDto>>> GetAll(
            [FromQuery] ulong? patientId,
            [FromQuery] string? status)
        {
            var prescriptions = await _presService.GetAllAsync(patientId, status);
            return Ok(prescriptions);
        }

        /// <summary>
        /// Lấy chi tiết một đơn thuốc theo ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<PrescriptionResponseDto>> GetById(ulong id)
        {
            var result = await _presService.GetByIdAsync(id);
            return result == null
                ? NotFound("Không tìm thấy đơn thuốc.")
                : Ok(result);
        }

        /// <summary>
        /// Tạo đơn thuốc mới
        /// </summary>
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

        /// <summary>
        /// Cập nhật thông tin đơn thuốc
        /// </summary>
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

        /// <summary>
        /// Xóa mềm đơn thuốc (đánh dấu IsDeleted = true)
        /// </summary>
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

        /// <summary>
        /// Khôi phục đơn thuốc đã xóa mềm
        /// </summary>
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

        // ==================== CHI TIẾT THUỐC TRONG ĐƠN ====================

        /// <summary>
        /// Thêm thuốc vào đơn
        /// </summary>
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

        /// <summary>
        /// Cập nhật một mục thuốc trong đơn (số lượng, liều dùng)
        /// </summary>
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

        /// <summary>
        /// Xóa một mục thuốc khỏi đơn
        /// </summary>
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

        /// <summary>
        /// Xác nhận đơn thuốc theo mã code (dùng khi tạo task)
        /// </summary>
        [HttpPost("approve-by-code")]
        public async Task<ActionResult<PrescriptionResponseDto>> ApproveByCode([FromBody] ApprovePrescriptionByCodeDto dto)
        {
            try
            {
                var result = await _presService.ApproveByCodeAsync(dto.PrescriptionCode);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}