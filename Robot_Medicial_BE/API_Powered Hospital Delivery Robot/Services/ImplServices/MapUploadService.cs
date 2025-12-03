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
            // --- Kiểm tra map name trùng ---
            var existing = await _repository.GetByNameAsync(dto.MapName);
            if (existing != null)
                throw new InvalidOperationException($"Map with name '{dto.MapName}' already exists.");

            // --- Ánh xạ DTO -> Entity ---
            var map = _mapper.Map<Map>(dto);
            map.CreatedAt = DateTime.Now;

            // --- Validate threshold ---
            if (dto.OccupiedThresh.HasValue && (dto.OccupiedThresh < 0 || dto.OccupiedThresh > 1))
                throw new ArgumentException("Occupied threshold must be between 0 and 1");

            if (dto.FreeThresh.HasValue && (dto.FreeThresh < 0 || dto.FreeThresh > 1))
                throw new ArgumentException("Free threshold must be between 0 and 1");

            // --- Xử lý file ảnh nếu có ---
            if (imageFile != null && imageFile.Length > 0)
            {
                if (imageFile.Length > 10 * 1024 * 1024)
                    throw new ArgumentException("Image file too large (max 10MB)");

                using var ms = new MemoryStream();
                await imageFile.CopyToAsync(ms);
                map.ImageData = ms.ToArray();
                map.ImageName = imageFile.FileName;
            }

            // --- Lưu vào database ---
            var created = await _repository.UploadAsync(map);

            // --- Trả về DTO ---
            return _mapper.Map<MapResponseDto>(created);
        }
    }
}
