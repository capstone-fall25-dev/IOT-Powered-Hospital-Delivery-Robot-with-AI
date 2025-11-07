using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RobotCompartmentsController : ControllerBase
    {
        private readonly IRobotCompartmentService _service;

        public RobotCompartmentsController(IRobotCompartmentService service)
        {
            _service = service;
        }

        // UC 38: Open hộp thuốc bởi bác sĩ (update "unlocked")
        [HttpPatch("{id}/open")]
       // [Authorize(Roles = "doctor")]
        public async Task<ActionResult<RobotCompartmentResponseDto>> Open(ulong id)
        {
            try
            {
                var updated = await _service.OpenCompartmentAsync(id);
                if (updated == null) return NotFound("Compartment not found");
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message); // Invalid status
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message); // Not found
            }
        }

        // UC 38: Close hộp thuốc bởi bác sĩ (update "locked")
        [HttpPatch("{id}/close")]
       // [Authorize(Roles = "doctor")]
        public async Task<ActionResult<RobotCompartmentResponseDto>> Close(ulong id)
        {
            try
            {
                var updated = await _service.CloseCompartmentAsync(id);
                if (updated == null) return NotFound("Compartment not found");
                return Ok(updated);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}