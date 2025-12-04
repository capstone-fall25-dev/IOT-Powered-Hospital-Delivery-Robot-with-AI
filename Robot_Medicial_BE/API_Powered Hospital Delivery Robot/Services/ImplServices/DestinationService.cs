using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý điểm đến cho robot
    /// </summary>
    public class DestinationService : IDestinationService
    {
        private readonly IDestinationRepository _repository;
        private readonly IMapper _mapper;

        public DestinationService(IDestinationRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        /// <summary>
        /// Tạo điểm đến mới
        /// </summary>
        public async Task<DestinationResponseDto> CreateAsync(DestinationDto dto)
        {
            var existing = await _repository.GetByNameAsync(dto.Name);
            if (existing != null) throw new InvalidOperationException("Tên điểm đến đã tồn tại");
            var dest = _mapper.Map<Destination>(dto);
            dest.CreatedAt = DateTime.Now;
            var created = await _repository.CreateAsync(dest);
            return _mapper.Map<DestinationResponseDto>(created);
        }

        /// <summary>
        /// Lấy danh sách điểm đến (có thể lọc theo khu vực, tầng)
        /// </summary>
        public async Task<IEnumerable<DestinationResponseDto>> GetAllAsync(string? area = null, string? floor = null)
        {
            var dests = await _repository.GetAllAsync(area, floor);
            return _mapper.Map<IEnumerable<DestinationResponseDto>>(dests);
        }

        /// <summary>
        /// Lấy chi tiết điểm đến theo ID
        /// </summary>
        public async Task<DestinationResponseDto?> GetByIdAsync(ulong id)
        {
            var dest = await _repository.GetByIdAsync(id);
            return dest != null ? _mapper.Map<DestinationResponseDto>(dest) : null;
        }

        /// <summary>
        /// Cập nhật thông tin điểm đến
        /// </summary>
        public async Task<DestinationResponseDto?> UpdateAsync(ulong id, DestinationDto dto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) throw new InvalidOperationException("Không tìm thấy điểm đến");
            if (dto.Name != existing.Name)
            {
                var nameExisting = await _repository.GetByNameAsync(dto.Name);
                if (nameExisting != null) throw new InvalidOperationException("Tên điểm đến đã tồn tại");
            }
            var dest = _mapper.Map<Destination>(dto);
            dest.Id = id;
            var updated = await _repository.UpdateAsync(id, dest);
            return updated != null ? _mapper.Map<DestinationResponseDto>(updated) : null;
        }

        /// <summary>
        /// Lấy vị trí (x, y) của điểm đến
        /// </summary>
        public async Task<DestinationPositionDto?> GetPositionByIdAsync(ulong destinationId)
        {
            var pos = await _repository.GetPositionByIdAsync(destinationId);
            if (pos == null)
                throw new InvalidOperationException("Không tìm thấy địa điểm.");
            return pos;
        }
    }
}
