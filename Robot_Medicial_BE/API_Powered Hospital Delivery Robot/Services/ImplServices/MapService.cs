using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý bản đồ cho robot
    /// </summary>
    public class MapService : IMapService
    {
        private readonly IMapRepository _repository;
        private readonly IMapper _mapper;
        private readonly IAlertService _alertService;
        private readonly IRobotRepository _robotRepository;
        private readonly IHubContext<AlertHub> _alertHub;

        public MapService(IMapRepository repository, 
            IMapper mapper, 
            IAlertService alertService, 
            IRobotRepository robotRepository,
            IHubContext<AlertHub> alertHub)
        {
            _repository = repository;
            _mapper = mapper;
            _alertService = alertService;
            _robotRepository = robotRepository;
            _alertHub = alertHub;
        }

        /// <summary>
        /// Tạo bản đồ mới
        /// </summary>
        public async Task<MapResponseDto> CreateAsync(MapDto mapDto, IFormFile? imageFile = null)
        {
            var existing = await _repository.GetByNameAsync(mapDto.MapName);
            if (existing != null)
            {
                throw new InvalidOperationException("Tên bản đồ đã tồn tại");
            }
            // Kiểm tra ngưỡng threshold
            if (mapDto.OccupiedThresh.HasValue && (mapDto.OccupiedThresh < 0 || mapDto.OccupiedThresh > 1))
            {
                throw new ArgumentException("Ngưỡng chiếm lĩnh phải nằm trong khoảng 0 và 1");
            }
            if (mapDto.FreeThresh.HasValue && (mapDto.FreeThresh < 0 || mapDto.FreeThresh > 1))
            {
                throw new ArgumentException("Ngưỡng free phải nằm trong khoảng 0 và 1");
            }
            
            var map = _mapper.Map<Map>(mapDto);

            if (string.IsNullOrEmpty(map.MapName))
            {
                throw new InvalidOperationException("Mapping thất bại: MapName là null sau AutoMapper");
            }

            map.CreatedAt = DateTime.Now;
            // Xử lý upload hình ảnh
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

        /// <summary>
        /// Lấy danh sách tất cả bản đồ
        /// </summary>
        public async Task<IEnumerable<MapResponseDto>> GetAllAsync()
        {
            var maps = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<MapResponseDto>>(maps);
        }

        /// <summary>
        /// Lấy chi tiết bản đồ theo ID (bao gồm thống kê nhiệm vụ)
        /// </summary>
        public async Task<MapResponseDto?> GetByIdAsync(ulong id)
        {
            var map = await _repository.GetByIdAsync(id, includeRobots: true);
            if (map == null) return null;

            var dto = _mapper.Map<MapResponseDto>(map);

            // Tính TaskCount cho từng điểm đến
            dto.Destinations = map.Destinations.Select(d => new DestinationResponseDto
            {
                Id = d.Id,
                Name = d.Name,
                Area = d.Area,
                Floor = d.Floor,
                X = d.X,
                Y = d.Y,
                MapId = d.MapId,
                CreatedAt = d.CreatedAt,
                TaskCount = d.TaskStops.Count()
            }).ToList();

            // Thống kê nhiệm vụ trên bản đồ
            var tasks = map.Tasks;

            // Tổng số nhiệm vụ
            dto.TotalTasks = tasks.Count();

            // Hôm nay
            dto.TasksToday = tasks.Count(t => t.CreatedAt.Date == DateTime.Today);

            // Tuần này
            var weekStart = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek);
            dto.TasksThisWeek = tasks.Count(t => t.CreatedAt.Date >= weekStart);

            return dto;
        }

        /*        public async Task<MapResponseDto?> UpdateAsync(ulong id, MapDto mapDto, IFormFile? imageFile = null)
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
                }*/

        /// <summary>
        /// Cập nhật thông tin bản đồ
        /// </summary>
        public async Task<MapResponseDto?> UpdateAsync(ulong id, MapDto mapDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Không tìm thấy bản đồ");
            }

            // Không cho phép sửa MapName
            if (mapDto.MapName != existing.MapName)
            {
                throw new InvalidOperationException("Không thể thay đổi tên bản đồ");
            }

            // Kiểm tra ngưỡng threshold
            if (mapDto.OccupiedThresh.HasValue && (mapDto.OccupiedThresh < 0 || mapDto.OccupiedThresh > 1))
            {
                throw new ArgumentException("Ngưỡng occupied phải nằm trong khoảng 0 và 1");
            }
            if (mapDto.FreeThresh.HasValue && (mapDto.FreeThresh < 0 || mapDto.FreeThresh > 1))
            {
                throw new ArgumentException("Ngưỡng free phải nằm trong khoảng 0 và 1");
            }

            // Map DTO vào existing entity (để giữ nguyên ImageData và các trường không map)
            _mapper.Map(mapDto, existing);

            var updated = await _repository.UpdateAsync(id, existing);
            return updated != null ? _mapper.Map<MapResponseDto>(updated) : null;
        }

        /// <summary>
        /// Báo cáo lỗi bản đồ (tạo cảnh báo)
        /// </summary>
        public async Task<AlertResponseDto> ReportMapErrorAsync(MapErrorDto dto)
        {
            if (!dto.MapId.HasValue)
                throw new ArgumentException("MapId là bắt buộc.");

            var map = await _repository.GetByIdAsync(dto.MapId.Value);
            if (map == null)
                throw new Exception("Không tìm thấy bản đồ.");

            // Kiểm tra robot tồn tại
            var robot = await _robotRepository.GetByIdAsync(dto.RobotId);
            if (robot == null)
                throw new Exception($"Không tìm thấy robot với ID {dto.RobotId}.");

            var alert = new AlertDto
            {
                RobotId = dto.RobotId,
                Severity = "medium",
                Category = "obstacle",
                Status = "open",
                Message = $"Lỗi bản đồ ({dto.ErrorType}) được báo cáo bởi {dto.ReporterEmail ?? "không xác định"} " +
                          $"qua robot '{robot.Name}' trên bản đồ '{map.MapName}': {dto.Description}"
            };

            var createdAlert = await _alertService.CreateAsync(alert);

            // Phát realtime tới tất cả client
            await _alertHub.Clients.All.SendAsync("ReceiveAlert", createdAlert);

            return createdAlert;
        }
    }
}
