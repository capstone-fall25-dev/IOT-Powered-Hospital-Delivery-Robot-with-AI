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
        private readonly IPatientRepository _repoPatient;
        private readonly IMapper _mapper;

        public RoomService(IRoomRepository repository, IPatientRepository repoPatient, IMapper mapper)
        {
            _repository = repository;
            _repoPatient = repoPatient;
            _mapper = mapper;
        }

        // CREATE
        public async Task<RoomResponseDto> CreateAsync(RoomDto roomDto)
        {
            var room = _mapper.Map<Room>(roomDto);
            room.CreatedAt = DateTime.UtcNow;

            var created = await _repository.CreateAsync(room);
            return _mapper.Map<RoomResponseDto>(created);
        }

        // GET ALL
        public async Task<IEnumerable<RoomResponseDto>> GetAllAsync()
        {
            var rooms = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<RoomResponseDto>>(rooms);
        }

        // GET BY ID
        public async Task<RoomResponseDto?> GetByIdAsync(ulong id)
        {
            var room = await _repository.GetByIdAsync(id);

            if (room == null)
                throw new InvalidOperationException("Phòng không tồn tại.");

            return _mapper.Map<RoomResponseDto>(room);
        }

        // UPDATE
        public async Task<RoomResponseDto?> UpdateAsync(ulong id, RoomDto roomDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
                throw new InvalidOperationException("Phòng không tồn tại.");

            existing.RoomName = roomDto.RoomName;
            existing.Latitude = roomDto.Latitude;
            existing.Longitude = roomDto.Longitude;
            existing.MapId = roomDto.MapId;

            var updated = await _repository.UpdateAsync(id, existing);
            return _mapper.Map<RoomResponseDto>(updated);
        }

        // DELETE
        public async Task<bool> DeleteAsync(ulong id)
        {
            return await _repository.DeleteAsync(id);
        }

        public async Task<PatientResponseDto> MoveRoomAsync(ulong patientId, ulong newRoomId)
        {
            var patient = await _repoPatient.GetByIdAsync(patientId);
            if (patient == null)
                throw new InvalidOperationException("Bệnh nhân không tồn tại.");

            if (patient.RoomId == newRoomId)
                throw new InvalidOperationException("Bệnh nhân đã ở phòng này.");

            var room = await _repository.GetByIdAsync(newRoomId);
            if (room == null)
                throw new InvalidOperationException("Phòng mới không tồn tại.");

            patient.RoomId = newRoomId;
            await _repoPatient.UpdateAsync(patientId, patient);

            return _mapper.Map<PatientResponseDto>(patient);
        }
    }
}
