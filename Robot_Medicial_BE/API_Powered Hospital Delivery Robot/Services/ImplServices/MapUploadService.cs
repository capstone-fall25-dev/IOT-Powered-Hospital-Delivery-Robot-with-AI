using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.AspNetCore.Http;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Xử lý upload bản đồ từ robot (ROS2)
    /// </summary>
    public class MapUploadService : IMapUploadService
    {
        private readonly IMapRepository _repository;
        private readonly IMapper _mapper;

        public MapUploadService(IMapRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        /// <summary>
        /// Upload bản đồ mới (từ ROS2)
        /// </summary>
        public async Task<MapResponseDto> UploadAsync(MapUploadDto dto, IFormFile? imageFile = null)
{
    // Ánh xạ DTO -> Entity (dùng cho cả create/update)
    var incoming = _mapper.Map<Map>(dto);

    // Validate ngưỡng
    if (dto.OccupiedThresh.HasValue && (dto.OccupiedThresh < 0 || dto.OccupiedThresh > 1))
        throw new ArgumentException("Ngưỡng chiếm lĩnh phải nằm trong khoảng 0 và 1");

    if (dto.FreeThresh.HasValue && (dto.FreeThresh < 0 || dto.FreeThresh > 1))
        throw new ArgumentException("Ngưỡng free phải nằm trong khoảng 0 và 1");

    // Nếu có ảnh thì đọc bytes để sẵn trong 'incoming'
    if (imageFile != null && imageFile.Length > 0)
    {
        if (imageFile.Length > 10 * 1024 * 1024)
            throw new ArgumentException("File ảnh quá lớn (tối đa 10MB)");

        using var ms = new MemoryStream();
        await imageFile.CopyToAsync(ms);
        incoming.ImageData = ms.ToArray();
        incoming.ImageName = imageFile.FileName;
    }

    // Kiểm tra trùng tên → UPDATE; không trùng → CREATE
    var existing = await _repository.GetByNameAsync(dto.MapName);
    if (existing != null)
    {
        // Giữ nguyên Id/CreatedAt của bản đồ cũ
        incoming.Id        = existing.Id;
        incoming.CreatedAt = existing.CreatedAt;

        // Gọi Update để ghi đè các field (ảnh chỉ thay khi có gửi lên)
        var updated = await _repository.UpdateAsync(existing.Id, incoming);
        return _mapper.Map<MapResponseDto>(updated!);
    }
    else
    {
        // CREATE như cũ
        incoming.CreatedAt = DateTime.Now;
        var created = await _repository.UploadAsync(incoming);
        return _mapper.Map<MapResponseDto>(created);
    }
}
 }
}
