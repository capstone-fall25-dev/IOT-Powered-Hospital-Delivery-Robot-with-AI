using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class RobotCompartmentService : IRobotCompartmentService
    {
        private readonly IRobotCompartmentRepository _repository;
        private readonly IMapper _mapper;

        public RobotCompartmentService(IRobotCompartmentRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        // UC 38: Open compartment (update "unlocked")
        public async Task<RobotCompartmentResponseDto?> OpenCompartmentAsync(ulong id)
        {
            var updated = await _repository.UpdateStatusAsync(id, "unlocked");
            return updated != null ? _mapper.Map<RobotCompartmentResponseDto>(updated) : null;
        }

        // UC 38: Close compartment (update "locked")
        public async Task<RobotCompartmentResponseDto?> CloseCompartmentAsync(ulong id)
        {
            var updated = await _repository.UpdateStatusAsync(id, "locked");
            return updated != null ? _mapper.Map<RobotCompartmentResponseDto>(updated) : null;
        }
    }
}