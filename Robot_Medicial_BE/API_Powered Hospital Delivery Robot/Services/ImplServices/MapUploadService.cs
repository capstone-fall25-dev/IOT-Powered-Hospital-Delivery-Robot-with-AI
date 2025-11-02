using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.AspNetCore.Http;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class MapUploadService : IMapUploadService
    {
        private readonly IMapRepository _repository;
        private readonly IMapper _mapper;

        public MapUploadService(IMapRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<MapResponseDto> UploadAsync(MapUploadDto dto, IFormFile? imageFile = null)
        {
            // Kiểm tra trùng tên
            var existing = await _repository.GetByNameAsync(dto.MapName);
            if (existing != null)
                throw new InvalidOperationException("Map name already exists");

            // Map DTO sang Entity
            var map = new Map
            {
                MapName = dto.MapName,
                Mode = dto.Mode,
                Resolution = dto.Resolution,
                OriginX = dto.OriginX,
                OriginY = dto.OriginY,
                OriginZ = dto.OriginZ,
                OccupiedThresh = dto.OccupiedThresh,
                FreeThresh = dto.FreeThresh,
                Negate = dto.Negate,
                CreatedAt = DateTime.UtcNow
            };

            // Xử lý upload image nếu có
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
    }
}
