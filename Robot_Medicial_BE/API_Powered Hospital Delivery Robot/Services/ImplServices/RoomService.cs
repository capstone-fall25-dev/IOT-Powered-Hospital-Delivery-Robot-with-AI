using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class RoomService : IRoomService
    {
        private readonly IRoomRepository _repository;
        private readonly IMapper _mapper;

        public RoomService(IRoomRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<RoomResponseDto> CreateAsync(RoomDto roomDto)
        {
            var room = _mapper.Map<Room>(roomDto);
            room.CreatedAt = DateTime.UtcNow;

            var created = await _repository.CreateAsync(room);
            return _mapper.Map<RoomResponseDto>(created);
        }

        public async Task<IEnumerable<RoomResponseDto>> GetAllAsync()
        {
            var rooms = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<RoomResponseDto>>(rooms);
        }

        public async Task<RoomResponseDto?> GetByIdAsync(ulong id)
        {
            var room = await _repository.GetByIdAsync(id);
            return room != null ? _mapper.Map<RoomResponseDto>(room) : null;
        }

        public async Task<RoomResponseDto?> UpdateAsync(ulong id, RoomDto roomDto)
        {
            var room = _mapper.Map<Room>(roomDto);
            var updated = await _repository.UpdateAsync(id, room);
            return updated != null ? _mapper.Map<RoomResponseDto>(updated) : null;
        }
    }
}
