using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class DestinationService : IDestinationService
    {
        private readonly IDestinationRepository _repository;
        private readonly IMapper _mapper;

        public DestinationService(IDestinationRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<DestinationResponseDto> CreateAsync(DestinationDto destinationDto)
        {
            var existing = await _repository.GetByNameAsync(destinationDto.Name);
            if (existing != null)
            {
                throw new InvalidOperationException("Điểm dừng đã tồn tại");
            }

            var destination = _mapper.Map<Destination>(destinationDto);
            destination.CreatedAt = DateTime.Now;

            var created = await _repository.CreateAsync(destination);
            return _mapper.Map<DestinationResponseDto>(created);
        }

        public async Task<IEnumerable<DestinationResponseDto>> GetAllAsync()
        {
            var destinations = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<DestinationResponseDto>>(destinations);
        }

        public async Task<DestinationResponseDto?> GetByIdAsync(ulong id)
        {
            var destination = await _repository.GetByIdAsync(id);
            if (destination != null)
            {
                return _mapper.Map<DestinationResponseDto>(destination);
            }
            return null;
        }

        public async Task<DestinationResponseDto?> UpdateAsync(ulong id, DestinationDto destinationDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Không thấy điểm dừng");
            }

            if (destinationDto.Name != existing.Name)
            {
                var nameExisting = await _repository.GetByNameAsync(destinationDto.Name);
                if (nameExisting != null)
                {
                    throw new InvalidOperationException("Điểm dừng đã tồn tại");
                }
            }

            var destination = _mapper.Map<Destination>(destinationDto);
            destination.Id = id;

            var updated = await _repository.UpdateAsync(id, destination);
            if (updated != null)
            {
                return _mapper.Map<DestinationResponseDto>(updated);
            }
            return null;
        }
    }
}
