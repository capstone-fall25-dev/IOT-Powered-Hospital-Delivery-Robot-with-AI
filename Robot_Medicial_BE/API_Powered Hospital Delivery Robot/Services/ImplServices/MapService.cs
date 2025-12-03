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

            // 🔍 DEBUG LOG: Kiểm tra sau mapping
            Console.WriteLine($"Mapped entity MapName: '{map.MapName}' (should be '{mapDto.MapName}')");
            if (string.IsNullOrEmpty(map.MapName))
            {
                throw new InvalidOperationException("Mapping failed: MapName is null after AutoMapper");  // Fail fast để debug
            }

            map.CreatedAt = DateTime.Now;
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
            if (map == null) return null;

            var dto = _mapper.Map<MapResponseDto>(map);

            // === Tính TaskCount cho từng điểm đến ===
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

            // === THỐNG KÊ TASK TRÊN MAP ===
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

        public async Task<MapResponseDto?> UpdateAsync(ulong id, MapDto mapDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Map not found");
            }

            // Không cho phép sửa MapName - kiểm tra nếu DTO có MapName khác existing
            if (mapDto.MapName != existing.MapName)
            {
                throw new InvalidOperationException("Map name cannot be changed");
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

            // Map DTO vào existing entity (để giữ nguyên ImageData và các trường không map)
            _mapper.Map(mapDto, existing);
            // Không cần set Id, CreatedAt - đã ignore trong mapping

            var updated = await _repository.UpdateAsync(id, existing);
            return updated != null ? _mapper.Map<MapResponseDto>(updated) : null;
        }

        public async Task<AlertResponseDto> ReportMapErrorAsync(MapErrorDto dto)
        {
            if (!dto.MapId.HasValue)
                throw new ArgumentException("MapId is required.");

            var map = await _repository.GetByIdAsync(dto.MapId.Value);
            if (map == null)
                throw new Exception("Map not found.");

            // Kiểm tra robot tồn tại
            var robot = await _robotRepository.GetByIdAsync(dto.RobotId);
            if (robot == null)
                throw new Exception($"Robot with ID {dto.RobotId} not found.");

            var alert = new AlertDto
            {
                RobotId = dto.RobotId,
                Severity = "medium",
                Category = "obstacle",
                Status = "open",
                Message = $"Map Error ({dto.ErrorType}) reported by {dto.ReporterEmail ?? "unknown"} " +
                          $"via robot '{robot.Name}' on map '{map.MapName}': {dto.Description}"
            };

            var createdAlert = await _alertService.CreateAsync(alert);

            // Phát realtime tới tất cả client
            await _alertHub.Clients.All.SendAsync("ReceiveAlert", createdAlert);

            return createdAlert;
        }
    }
}
