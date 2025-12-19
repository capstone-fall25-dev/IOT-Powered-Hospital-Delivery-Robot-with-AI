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
        private readonly ILogger<MapUploadService> _logger;

        public MapUploadService(IMapRepository repository, IMapper mapper, ILogger<MapUploadService> logger)
        {
            _repository = repository;
            _mapper = mapper;
            _logger = logger;
        }

        /// <summary>
        /// Upload từ ROS2 (multipart/file). Trùng tên => update.
        /// </summary>
        public async Task<MapResponseDto> UploadAsync(MapUploadDto dto, IFormFile? imageFile = null)
        {
            var incoming = _mapper.Map<Map>(dto);

            if (dto.OccupiedThresh is < 0 or > 1)
                throw new ArgumentException("Ngưỡng chiếm lĩnh phải nằm trong khoảng 0 và 1");
            if (dto.FreeThresh is < 0 or > 1)
                throw new ArgumentException("Ngưỡng free phải nằm trong khoảng 0 và 1");

            if (imageFile != null && imageFile.Length > 0)
            {
                if (imageFile.Length > 10 * 1024 * 1024)
                    throw new ArgumentException("File ảnh quá lớn (tối đa 10MB)");

                using var ms = new MemoryStream();
                await imageFile.CopyToAsync(ms);
                incoming.ImageData = ms.ToArray();
                incoming.ImageName = imageFile.FileName;
                _logger.LogInformation("[MapUploadService] file upload: {Name}, {Len} bytes", incoming.ImageName, incoming.ImageData.Length);
            }

            var existing = await _repository.GetByNameAsync(dto.MapName);
            if (existing != null)
            {
                incoming.Id        = existing.Id;
                incoming.CreatedAt = existing.CreatedAt;

                var updated = await _repository.UpdateAsync(existing.Id, incoming);
                return _mapper.Map<MapResponseDto>(updated!);
            }
            else
            {
                incoming.CreatedAt = DateTime.Now;
                var created = await _repository.UploadAsync(incoming);
                return _mapper.Map<MapResponseDto>(created);
            }
        }

        /// <summary>
        /// Upload JSON base64 trực tiếp. Trùng tên => update toàn bộ; không gửi ảnh => giữ ảnh cũ.
        /// </summary>
        public async Task<MapResponseDto> UploadJsonAsync(MapUploadJsonDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.MapName))
                throw new ArgumentException("MapName không được trống");

            // Map tất cả field metadata
            var incoming = new Map
            {
                MapName        = dto.MapName,
                Mode           = dto.Mode,
                Resolution     = dto.Resolution,
                OriginX        = dto.OriginX,
                OriginY        = dto.OriginY,
                OriginZ        = dto.OriginZ,
                OccupiedThresh = dto.OccupiedThresh,
                FreeThresh     = dto.FreeThresh,
                Negate         = dto.Negate,
                ImageName      = dto.ImageName
            };

            // Decode ảnh nếu có
            if (!string.IsNullOrWhiteSpace(dto.ImageBase64))
            {
                try
                {
                    incoming.ImageData = Convert.FromBase64String(dto.ImageBase64);
                    if (string.IsNullOrWhiteSpace(incoming.ImageName))
                        incoming.ImageName = "map.bin";
                    _logger.LogInformation("[MapUploadService] json upload: {Name}, {Len} bytes", incoming.ImageName, incoming.ImageData?.Length ?? 0);
                }
                catch (FormatException)
                {
                    throw new ArgumentException("ImageBase64 không hợp lệ");
                }
            }

            var existing = await _repository.GetByNameAsync(dto.MapName);
            if (existing != null)
            {
                incoming.Id        = existing.Id;
                incoming.CreatedAt = existing.CreatedAt;

                var updated = await _repository.UpdateAsync(existing.Id, incoming);

                // Reload để đảm bảo trả về giá trị mới nhất
                var reloaded = await _repository.GetByIdAsync(updated!.Id);
                return _mapper.Map<MapResponseDto>(reloaded!);
            }
            else
            {
                incoming.CreatedAt = DateTime.Now;
                var created = await _repository.UploadAsync(incoming);

                var reloaded = await _repository.GetByIdAsync(created.Id);
                return _mapper.Map<MapResponseDto>(reloaded!);
            }
        }
    }
}
