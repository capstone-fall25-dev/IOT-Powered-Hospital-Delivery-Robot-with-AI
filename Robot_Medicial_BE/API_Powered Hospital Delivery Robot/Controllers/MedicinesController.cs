using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MedicinesController : ControllerBase
    {
        private readonly IMedicineService _service;

        public MedicinesController(IMedicineService service)
        {
            _service = service;
        }

        // Lấy danh sách thuốc (lọc categoryId/status) - UC 41: Manage Medicine Inventory & UC 45: Generate Medicine Stock Report (Medicine Management)
        [HttpGet]
        public async Task<ActionResult<IEnumerable<MedicineResponseDto>>> GetAll([FromQuery] ulong? categoryId = null, [FromQuery] string? status = null)
        {
            var medicines = await _service.GetAllAsync(categoryId, status == null ? null : (MedicineStatus?)Enum.Parse(typeof(MedicineStatus), status));
            return Ok(medicines);
        }

        // Lấy chi tiết thuốc - UC 43: Update Medicine Information (Medicine Management)
        [HttpGet("{id}")]
        public async Task<ActionResult<MedicineResponseDto>> GetById(ulong id)
        {
            var medicine = await _service.GetByIdAsync(id);
            if (medicine == null) return NotFound();
            return Ok(medicine);
        }

        // Tạo thuốc mới (validate unique code) - UC 42: Register New Medicine (Medicine Management)
        [HttpPost]
        public async Task<ActionResult<MedicineResponseDto>> Create(MedicineDto medicineDto)
        {
            try
            {
                var created = await _service.CreateAsync(medicineDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Cập nhật thông tin thuốc (validate unique code) - UC 43: Update Medicine Information (Medicine Management)
        [HttpPut("{id}")]
        public async Task<ActionResult<MedicineResponseDto>> Update(ulong id, MedicineDto medicineDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, medicineDto);
                if (updated == null) return NotFound();
                return Ok(updated);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Scan thuốc hết hạn (flag expired or clear stock) - UC 44: Remove Expired Medicines (Medicine Management)
        [HttpPost("scan-expired")]
        public async Task<ActionResult<ScanExpiredResponseDto>> ScanExpired([FromBody] ScanExpiredDto scanDto)
        {
            try
            {
                var response = await _service.ScanExpiredAsync(scanDto.FlagOnly);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Xóa thuốc hết hạn (hard delete) - UC 44: Remove Expired Medicines (Medicine Management)
        [HttpDelete("remove-expired")]
        public async Task<ActionResult<int>> RemoveExpired()
        {
            try
            {
                var count = await _service.RemoveExpiredAsync();
                return Ok(count);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // Tạo báo cáo tồn kho thuốc (shortages/trends dispensed last month) - UC 45: Generate Medicine Stock Report (Medicine Management)
        [HttpGet("stock-report")]
        public async Task<ActionResult<IEnumerable<MedicineStockReportDto>>> GetStockReport([FromQuery] int threshold = 10)
        {
            var reports = await _service.GetStockReportAsync(threshold);
            return Ok(reports);
        }
    }
}
