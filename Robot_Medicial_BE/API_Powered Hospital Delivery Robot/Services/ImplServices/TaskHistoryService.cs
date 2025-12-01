using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskHistoryService : ITaskHistoryService
    {
        private readonly ITaskHistoryRepository _repo;
        private readonly IMapper _mapper;

        public TaskHistoryService(ITaskHistoryRepository repo, IMapper mapper)
        {
            _repo = repo;
            _mapper = mapper;
        }

        public async System.Threading.Tasks.Task CreateHistoryFromTaskAsync(Models.Entities.Task task)
        {
            var history = new TaskHistory
            {
                TaskId = task.Id,
                RobotId = task.RobotId,
                RobotCode = task.Robot.Code,
                RobotName = task.Robot.Name,
                AssignedBy = task.AssignedBy,
                AssignedByName = task.AssignedByNavigation?.FullName ?? "Hệ thống",
                AssignedByEmail = task.AssignedByNavigation?.Email ?? "system@hospital.com",
                MapId = task.MapId,
                MapName = task.Map?.MapName,
                Priority = task.Priority,
                FinalStatus = task.Status,
                CreatedAt = task.CreatedAt,
                ScheduledStartAt = task.ScheduledStartAt,
                StartedAt = task.StartedAt,
                CompletedAt = task.CompletedAt,
                TotalDurationS = task.TotalDurationS,
                TotalErrors = task.TotalErrors,
                TotalStops = task.TaskStops.Count,
                DeliveredStops = task.TaskStops.Count(s => s.Status == "delivered"),
                SkippedStops = task.TaskStops.Count(s => s.Status == "skipped"),
                FailedStops = task.TaskStops.Count(s => s.Status == "failed"),
                StopHistories = task.TaskStops.Select(s => new TaskStopHistory
                {
                    SeqNo = s.SeqNo,
                    DestinationName = s.Destination?.Name ?? s.CustomName ?? "Không xác định",
                    PatientId = s.PatientId,
                    PatientCode = s.Patient?.PatientCode,
                    PatientName = s.Patient?.FullName,
                    RoomNumber = s.Patient?.RoomNumber,
                    CompartmentCode = s.CompartmentAssignments.FirstOrDefault()?.Compartment?.CompartmentCode,
                    ItemDesc = s.CompartmentAssignments.FirstOrDefault()?.ItemDesc,
                    Status = s.Status,
                    ArrivedAt = s.ArrivedAt,
                    DeliveredAt = s.HandedOverAt ?? s.ArrivedAt,
                    DurationSeconds = s.ArrivedAt.HasValue
                        ? (int?)(s.HandedOverAt ?? DateTime.UtcNow).Subtract(s.ArrivedAt.Value).TotalSeconds
                        : null
                }).ToList()
            };

            await _repo.AddAsync(history);
        }

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
        public async Task<TaskHistory?> GetLastHistoryAsync(ulong taskId)
        {
            return await _repo.GetLastHistoryAsync(taskId);
        }
        public async Task<TaskHistoryResponseDto?> GetDetailAsync(ulong historyId)
        {
            var entity = await _repo.GetByIdAsync(historyId);
            if (entity == null) return null;

            return _mapper.Map<TaskHistoryResponseDto>(entity);
        }
    }
}
