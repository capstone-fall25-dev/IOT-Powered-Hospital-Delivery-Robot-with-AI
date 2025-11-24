using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/medicine")]
    [ApiController]
    //[Authorize]
    public class MedicinesController : ControllerBase
    {
        private readonly IMedicineService _service;

        public MedicinesController(IMedicineService service)
        {
            _service = service;
        }

        // ============================== DANH MỤC THUỐC (CATEGORY) ==============================

        // Lấy danh sách tất cả danh mục thuốc
        [HttpGet("categories")]
        public async Task<ActionResult<IEnumerable<CategoryResponseDto>>> GetCategories()
        {
            var categories = await _service.GetAllCategoriesAsync();
            return Ok(categories);
        }

        // Tạo danh mục thuốc mới
        [HttpPost("categories")]
        public async Task<ActionResult<CategoryResponseDto>> CreateCategory([FromBody] CategoryCreateDto dto)
        {
            try
            {
                var created = await _service.CreateCategoryAsync(dto);
                return CreatedAtAction(nameof(GetCategories), created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật danh mục thuốc
        [HttpPut("categories/{id}")]
        public async Task<ActionResult<CategoryResponseDto>> UpdateCategory(ulong id, [FromBody] CategoryUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateCategoryAsync(id, dto);
                return updated == null
                    ? NotFound("Không tìm thấy danh mục thuốc.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Xóa danh mục thuốc (chỉ khi không còn thuốc nào thuộc về nó)
        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(ulong id)
        {
            try
            {
                await _service.DeleteCategoryAsync(id);
                return Ok(new { message = "Đã xóa danh mục thuốc thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ============================== THUỐC (MEDICINE) ==============================

        // Lấy danh sách tất cả thuốc
        [HttpGet("list")]
        public async Task<ActionResult<IEnumerable<MedicineResponseDto>>> GetMedicines()
        {
            var medicines = await _service.GetAllMedicinesAsync();
            return Ok(medicines);
        }

        // Lấy thông tin chi tiết một loại thuốc theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<MedicineResponseDto>> GetMedicine(ulong id)
        {
            var medicine = await _service.GetMedicineByIdAsync(id);
            return medicine == null
                ? NotFound("Không tìm thấy thuốc.")
                : Ok(medicine);
        }

        // Thêm thuốc mới vào hệ thống
        [HttpPost]
        public async Task<ActionResult<MedicineResponseDto>> CreateMedicine([FromBody] MedicineCreateDto dto)
        {
            try
            {
                var created = await _service.CreateMedicineAsync(dto);
                return CreatedAtAction(nameof(GetMedicine), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật thông tin thuốc (tên, liều lượng, đơn vị, tồn kho,...)
        [HttpPut("{id}")]
        public async Task<ActionResult<MedicineResponseDto>> UpdateMedicine(ulong id, [FromBody] MedicineUpdateDto dto)
        {
            try
            {
                var updated = await _service.UpdateMedicineAsync(id, dto);
                return updated == null
                    ? NotFound("Không tìm thấy thuốc để cập nhật.")
                    : Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Xóa thuốc 
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMedicine(ulong id)
        {
            try
            {
                await _service.DeleteMedicineAsync(id);
                return Ok(new { message = "Đã xóa thuốc thành công." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}