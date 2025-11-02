using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DrugCategoriesController : ControllerBase
    {
        private readonly IDrugCategoryService _service;

        public DrugCategoriesController(IDrugCategoryService service)
        {
            _service = service;
        }

        // Lấy danh sách loại thuốc - UC 42: Register New Medicine (Medicine Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DrugCategoryResponseDto>>> GetAll()
        {
            var categories = await _service.GetAllAsync();
            return Ok(categories);
        }

        // Lấy chi tiết loại thuốc - UC 42: Register New Medicine (Medicine Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<DrugCategoryResponseDto>> GetById(ulong id)
        {
            var category = await _service.GetByIdAsync(id);
            if (category == null) return NotFound();
            return Ok(category);
        }

        // Tạo loại thuốc mới (validate unique name) - UC 42: Register New Medicine (Medicine Management)
        [HttpPost]
        public async Task<ActionResult<DrugCategoryResponseDto>> Create(DrugCategoryDto categoryDto)
        {
            try
            {
                var created = await _service.CreateAsync(categoryDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật loại thuốc (validate unique name) - UC 43: Update Medicine Information (Medicine Management)
        [HttpPut("{id}")]
        public async Task<ActionResult<DrugCategoryResponseDto>> Update(ulong id, DrugCategoryDto categoryDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, categoryDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
