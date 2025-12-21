using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý lịch sử nhiệm vụ
    /// </summary>
    public class TaskHistoryService : ITaskHistoryService
    {
        private readonly ITaskHistoryRepository _repo;
        private readonly IMapper _mapper;

        public TaskHistoryService(ITaskHistoryRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }

        /// <summary>
        /// Tạo lịch sử từ nhiệm vụ (khi hoàn thành hoặc hủy)
        /// </summary>
        public async System.Threading.Tasks.Task CreateHistoryFromTaskAsync(Models.Entities.Task task, string? note = null)
        {
            var history = new TaskHistory
            {
                TaskId = task.Id,
                RobotId = task.RobotId,
                RobotCode = task.Robot?.Code ?? "N/A",
                RobotName = task.Robot?.Name ?? "N/A",
                AssignedBy = task.AssignedBy,
                AssignedByName = task.AssignedByNavigation?.FullName ?? "Hệ thống",
                AssignedByEmail = task.AssignedByNavigation?.Email ?? "system@hospital.com",
                MapId = task.MapId,
                MapName = task.Map?.MapName,
                Priority = task.Priority ?? "0",
                FinalStatus = task.Status ?? "unknown",
                CreatedAt = task.CreatedAt != default ? task.CreatedAt : DateTimeHelper.Now(),
                ScheduledStartAt = task.ScheduledStartAt,
                StartedAt = task.StartedAt,
                CompletedAt = task.CompletedAt,
                TotalDurationS = task.TotalDurationS,
                TotalErrors = task.TotalErrors,
                TotalStops = task.TaskStops?.Count ?? 0,
                DeliveredStops = task.TaskStops?.Count(s => s.Status == "delivered") ?? 0,
                SkippedStops = task.TaskStops?.Count(s => s.Status == "skipped") ?? 0,
                FailedStops = task.TaskStops?.Count(s => s.Status == "failed") ?? 0,
                Note = note?.Trim(), 
                RecordedAt = DateTimeHelper.Now(),
                StopHistories = (task.TaskStops ?? new List<Models.Entities.TaskStop>()).Select(s => new TaskStopHistory
                {
                    SeqNo = s.SeqNo,
                    DestinationName = s.Destination?.Name ?? s.CustomName ?? "Không xác định",
                    PatientId = s.PatientId,
                    PatientCode = s.Patient?.PatientCode,
                    PatientName = s.Patient?.FullName,
                    RoomNumber = s.Patient?.RoomNumber,
                    CompartmentCode = s.CompartmentAssignments?.FirstOrDefault()?.Compartment?.CompartmentCode,
                    CustomName = s.CustomName, // Mã đơn thuốc
                    ItemDesc = s.CompartmentAssignments?.FirstOrDefault()?.ItemDesc,
                    Status = s.Status ?? "unknown",
                    ArrivedAt = s.ArrivedAt,
                    DeliveredAt = s.HandedOverAt ?? s.ArrivedAt,
                    DurationSeconds = s.ArrivedAt.HasValue
                        ? (int?)(s.HandedOverAt ?? DateTimeHelper.Now()).Subtract(s.ArrivedAt.Value).TotalSeconds
                        : null
                }).ToList()
            };

            await _repo.AddAsync(history);
        }

        /// <summary>
        /// Lấy danh sách lịch sử nhiệm vụ (có phân trang và lọc)
        /// </summary>
        public async Task<PagedTaskHistoryDto> GetHistoryAsync(TaskHistoryFilterDto filter)
        {
            var items = await _repo.GetHistoryAsync(filter);
            var total = await _repo.GetHistoryCountAsync(filter);

            return new PagedTaskHistoryDto
            {
                Data = _mapper.Map<List<TaskHistoryResponseDto>>(items),
                TotalCount = total,
                CurrentPage = filter.Page,
                PageSize = filter.PageSize
            };
        }

        /// <summary>
        /// Lấy lịch sử gần nhất của một nhiệm vụ
        /// </summary>
        public async Task<TaskHistory?> GetLastHistoryAsync(ulong taskId)
        {
            return await _repo.GetLastHistoryAsync(taskId);
        }

        /// <summary>
        /// Lấy chi tiết lịch sử nhiệm vụ theo ID
        /// </summary>
        public async Task<TaskHistoryResponseDto?> GetDetailAsync(ulong historyId)
        {
            var entity = await _repo.GetByIdAsync(historyId);
            if (entity == null) return null;

            return _mapper.Map<TaskHistoryResponseDto>(entity);
        }
    }
}
