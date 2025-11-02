using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class MapService : IMapService
    {
        private readonly IMapRepository _repository;
        private readonly IMapper _mapper;

        public MapService(IMapRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<MapResponseDto> CreateAsync(MapDto mapDto, IFormFile? imageFile = null)
        {
            var existing = await _repository.GetByNameAsync(mapDto.MapName);
            if (existing != null)
            {
                throw new InvalidOperationException("Map name already exists");
            }

            // Validate thresh
            if (mapDto.OccupiedThresh.HasValue && (mapDto.OccupiedThresh < 0 || mapDto.OccupiedThresh > 1))
            {
                throw new ArgumentException("Occupied threshold must be between 0 and 1");
            }
            if (mapDto.FreeThresh.HasValue && (mapDto.FreeThresh < 0 || mapDto.FreeThresh > 1))
            {
                throw new ArgumentException("Free threshold must be between 0 and 1");
            }

            var map = _mapper.Map<Map>(mapDto);
            map.CreatedAt = DateTime.UtcNow;

            // Xử lý upload image
            if (imageFile != null && imageFile.Length > 0)
            {
                using var ms = new MemoryStream();
                await imageFile.CopyToAsync(ms);
                map.ImageData = ms.ToArray();
                map.ImageName = imageFile.FileName;
            }

            var created = await _repository.CreateAsync(map);
            return _mapper.Map<MapResponseDto>(created);
        }

        public async Task<IEnumerable<MapResponseDto>> GetAllAsync()
        {
            var maps = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<MapResponseDto>>(maps);
        }

        public async Task<MapResponseDto?> GetByIdAsync(ulong id)
        {
            var map = await _repository.GetByIdAsync(id, includeRobots: true);
            return map != null ? _mapper.Map<MapResponseDto>(map) : null;
        }

        public async Task<MapResponseDto?> UpdateAsync(ulong id, MapDto mapDto, IFormFile? imageFile = null)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Map not found");
            }

            if (mapDto.MapName != existing.MapName)
            {
                var nameExisting = await _repository.GetByNameAsync(mapDto.MapName);
                if (nameExisting != null)
                {
                    throw new InvalidOperationException("Map name already exists");
                }
            }

            // Validate thresh 
            if (mapDto.OccupiedThresh.HasValue && (mapDto.OccupiedThresh < 0 || mapDto.OccupiedThresh > 1))
            {
                throw new ArgumentException("Occupied threshold must be between 0 and 1");
            }
            if (mapDto.FreeThresh.HasValue && (mapDto.FreeThresh < 0 || mapDto.FreeThresh > 1))
            {
                throw new ArgumentException("Free threshold must be between 0 and 1");
            }

            var map = _mapper.Map<Map>(mapDto);
            map.Id = id;

            // Xử lý upload image mới nếu có
            if (imageFile != null && imageFile.Length > 0)
            {
                using var ms = new MemoryStream();
                await imageFile.CopyToAsync(ms);
                map.ImageData = ms.ToArray();
                map.ImageName = imageFile.FileName;
            }

            var updated = await _repository.UpdateAsync(id, map);
            return updated != null ? _mapper.Map<MapResponseDto>(updated) : null;
        }
    }
}
