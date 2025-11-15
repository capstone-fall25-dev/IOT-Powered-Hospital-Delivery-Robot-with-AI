using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/medicine")]
    [ApiController]
    public class MedicinesController : ControllerBase
    {
        private readonly IMedicineService _service;

        public MedicinesController(IMedicineService service)
        {
            _service = service;
        }

        // ================= CATEGORY =========================
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
            => Ok(await _service.GetAllCategoriesAsync());

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory(CategoryCreateDto dto)
            => Ok(await _service.CreateCategoryAsync(dto));

        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(ulong id, CategoryUpdateDto dto)
            => Ok(await _service.UpdateCategoryAsync(id, dto));

        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(ulong id)
            => Ok(await _service.DeleteCategoryAsync(id));

        // ================= MEDICINE =======================
        [HttpGet("list")]
        public async Task<IActionResult> GetMedicines()
            => Ok(await _service.GetAllMedicinesAsync());

        [HttpGet("{id}")]
        public async Task<IActionResult> GetMedicine(ulong id)
            => Ok(await _service.GetMedicineByIdAsync(id));

        [HttpPost]
        public async Task<IActionResult> CreateMedicine(MedicineCreateDto dto)
            => Ok(await _service.CreateMedicineAsync(dto));

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateMedicine(ulong id, MedicineUpdateDto dto)
            => Ok(await _service.UpdateMedicineAsync(id, dto));

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMedicine(ulong id)
            => Ok(await _service.DeleteMedicineAsync(id));
    }
}
