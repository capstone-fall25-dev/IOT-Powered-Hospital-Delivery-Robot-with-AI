using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CompartmentCategoriesController : ControllerBase
    {
        private readonly RobotManagerContext _context;

        public CompartmentCategoriesController(RobotManagerContext context)
        {
            _context = context;
        }

        // GET: api/CompartmentCategories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAll()
        {
            var categories = await _context.CompartmentCategories
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description
                })
                .ToListAsync();

            return Ok(categories);
        }

        // GET: api/CompartmentCategories/5
        [HttpGet("{id}")]
        public async Task<ActionResult<object>> GetById(ulong id)
        {
            var category = await _context.CompartmentCategories
                .Where(c => c.Id == id)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description
                })
                .FirstOrDefaultAsync();

            if (category == null)
                return NotFound(new { message = $"Không tìm thấy danh mục có Id = {id}" });

            return Ok(category);
        }

        // POST: api/CompartmentCategories
        [HttpPost]
        public async Task<ActionResult> Create([FromBody] CompartmentCategoryCreateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Kiểm tra tên đã tồn tại chưa (tránh trùng)
            if (await _context.CompartmentCategories.AnyAsync(c => c.Name == dto.Name.Trim()))
                return Conflict(new { message = $"Danh mục '{dto.Name}' đã tồn tại" });

            var category = new CompartmentCategory
            {
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim()
            };

            _context.CompartmentCategories.Add(category);
            await _context.SaveChangesAsync();

            // Trả về đối tượng vừa tạo kèm Id
            var result = new
            {
                category.Id,
                category.Name,
                category.Description
            };

            return CreatedAtAction(nameof(GetById), new { id = category.Id }, result);
        }

        // PUT: api/CompartmentCategories/5
        [HttpPut("{id}")]
        public async Task<ActionResult> Update(ulong id, [FromBody] CompartmentCategoryUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var category = await _context.CompartmentCategories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = $"Không tìm thấy danh mục có Id = {id}" });

            // Kiểm tra tên trùng (ngoại trừ chính nó)
            if (await _context.CompartmentCategories
                .AnyAsync(c => c.Name == dto.Name.Trim() && c.Id != id))
                return Conflict(new { message = $"Danh mục '{dto.Name}' đã tồn tại" });

            category.Name = dto.Name.Trim();
            category.Description = dto.Description?.Trim();

            _context.Entry(category).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Cập nhật thành công", data = new { category.Id, category.Name, category.Description } });
        }

        // DELETE: api/CompartmentCategories/5
        [HttpDelete("{id}")]
        public async Task<ActionResult> Delete(ulong  id)
        {
            var category = await _context.CompartmentCategories.FindAsync(id);
            if (category == null)
                return NotFound(new { message = $"Không tìm thấy danh mục có Id = {id}" });

            // Kiểm tra có compartment nào đang dùng category này không (nếu có quan hệ)
            var inUse = await _context.RobotCompartments.AnyAsync(c => c.CategoryId == id);
            if (inUse)
                return BadRequest(new { message = "Không thể xóa danh mục này vì đang có ngăn chứa sử dụng." });

            _context.CompartmentCategories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa danh mục thành công" });
        }
    }

    // DTOs để validate dữ liệu đầu vào
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