using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
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

        // ===================== PRESCRIPTION CRUD =====================

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] ulong? patientId, [FromQuery] string? status)
            => Ok(await _presService.GetAllAsync(patientId, status));

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(ulong id)
        {
            var result = await _presService.GetByIdAsync(id);
            return result == null ? NotFound() : Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create(PrescriptionCreateDto dto)
            => Ok(await _presService.CreateAsync(dto));

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(ulong id, PrescriptionUpdateDto dto)
            => Ok(await _presService.UpdateAsync(id, dto));

        [HttpDelete("{id}")]
        public async Task<IActionResult> SoftDelete(ulong id)
            => Ok(await _presService.SoftDeleteAsync(id));

        [HttpPatch("{id}/restore")]
        public async Task<IActionResult> Restore(ulong id)
            => Ok(await _presService.RestoreAsync(id));

        // ===================== PRESCRIPTION ITEM CRUD =====================

        [HttpPost("{id}/items")]
        public async Task<IActionResult> AddItem(ulong id, PrescriptionItemCreateDto dto)
        {
            dto.PrescriptionId = id;
            return Ok(await _itemService.CreateAsync(dto));
        }

        [HttpPut("items/{itemId}")]
        public async Task<IActionResult> UpdateItem(ulong itemId, PrescriptionItemUpdateDto dto)
            => Ok(await _itemService.UpdateAsync(itemId, dto));

        [HttpDelete("items/{itemId}")]
        public async Task<IActionResult> DeleteItem(ulong itemId)
            => Ok(await _itemService.DeleteAsync(itemId));
    }
}
