using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class CompartmentCategoriesController : ControllerBase
    {
        private readonly RobotManagerContext _context;

        public CompartmentCategoriesController(RobotManagerContext context)
        {
            _context = context;
        }

        // Lấy danh sách tất cả danh mục ngăn chứa (loại khoang: thuốc viên, thuốc nước, bơm kim tiêm, v.v.)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var categories = await _context.CompartmentCategories
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    CompartmentCount = _context.RobotCompartments.Count(rc => rc.CategoryId == c.Id)
                })
                .OrderBy(c => c.Name)
                .ToListAsync();

            return Ok(categories);
        }

        // Lấy thông tin chi tiết một danh mục theo id
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetById(ulong id)
        {
            var category = await _context.CompartmentCategories
                .Where(c => c.Id == id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    CompartmentCount = _context.RobotCompartments.Count(rc => rc.CategoryId == c.Id)
                })
                .FirstOrDefaultAsync();

            return category == null
                ? NotFound(new { message = $"Không tìm thấy danh mục ngăn chứa có Id = {id}" })
                : Ok(category);
        }

        // Tạo danh mục ngăn chứa mới
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CompartmentCategoryCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var trimmedName = dto.Name.Trim();
            if (await _context.CompartmentCategories.AnyAsync(c => c.Name == trimmedName))
                return Conflict(new { message = $"Danh mục '{trimmedName}' đã tồn tại." });

            var category = new CompartmentCategory
            {
                Name = trimmedName,
                Description = dto.Description?.Trim()
            };

            _context.CompartmentCategories.Add(category);
            await _context.SaveChangesAsync();

            var result = new
            {
                category.Id,
                category.Name,
                category.Description
            };

            return CreatedAtAction(nameof(GetById), new { id = category.Id }, result);
        }

        // Cập nhật danh mục ngăn chứa
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(ulong id, [FromBody] CompartmentCategoryUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var category = await _context.CompartmentCategories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = $"Không tìm thấy danh mục ngăn chứa có Id = {id}" });

            var trimmedName = dto.Name.Trim();
            if (await _context.CompartmentCategories.AnyAsync(c => c.Name == trimmedName && c.Id != id))
                return Conflict(new { message = $"Danh mục '{trimmedName}' đã tồn tại." });

            category.Name = trimmedName;
            category.Description = dto.Description?.Trim();

            _context.Entry(category).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Cập nhật danh mục thành công.",
                data = new { category.Id, category.Name, category.Description }
            });
        }

        // Xóa danh mục ngăn chứa (chỉ khi không có khoang nào đang dùng)
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(ulong id)
        {
            var category = await _context.CompartmentCategories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = $"Không tìm thấy danh mục ngăn chứa có Id = {id}" });

            var inUse = await _context.RobotCompartments.AnyAsync(c => c.CategoryId == id);
            if (inUse)
                return BadRequest(new { message = "Không thể xóa danh mục này vì đang có ngăn chứa robot sử dụng." });

            _context.CompartmentCategories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Đã xóa danh mục ngăn chứa thành công." });
        }
    }

    // ==================== DTOs ====================
    public class CompartmentCategoryCreateDto
    {
        [Required(ErrorMessage = "Tên danh mục là bắt buộc")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Tên phải từ 2-100 ký tự")]
        public string Name { get; set; } = null!;

        [StringLength(500, ErrorMessage = "Mô tả không được quá 500 ký tự")]
        public string? Description { get; set; }
    }

    public class CompartmentCategoryUpdateDto
    {
        [Required(ErrorMessage = "Tên danh mục là bắt buộc")]
        [StringLength(100, MinimumLength = 2, ErrorMessage = "Tên phải từ 2-100 ký tự")]
        public string Name { get; set; } = null!;

        [StringLength(500, ErrorMessage = "Mô tả không được quá 500 ký tự")]
        public string? Description { get; set; }
    }
}