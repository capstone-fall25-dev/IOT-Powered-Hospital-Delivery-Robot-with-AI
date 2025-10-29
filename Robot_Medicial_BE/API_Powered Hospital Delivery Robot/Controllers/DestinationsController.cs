using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace API_Powered_Hospital_Delivery_Robot.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DestinationsController : ControllerBase
    {
        private readonly IDestinationService _service;

        public DestinationsController(IDestinationService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<DestinationResponseDto>>> GetAll()
        {
            var destinations = await _service.GetAllAsync();
            return Ok(destinations);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<DestinationResponseDto>> GetById(ulong id)
        {
            var destination = await _service.GetByIdAsync(id);
            if (destination == null) return NotFound();
            return Ok(destination);
        }

        [HttpPost]
        public async Task<ActionResult<DestinationResponseDto>> Create(DestinationDto destinationDto)
        {
            try
            {
                var created = await _service.CreateAsync(destinationDto);
                return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<DestinationResponseDto>> Update(ulong id, DestinationDto destinationDto)
        {
            try
            {
                var updated = await _service.UpdateAsync(id, destinationDto);
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
