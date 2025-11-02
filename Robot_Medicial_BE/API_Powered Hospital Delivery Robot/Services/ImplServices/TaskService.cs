using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _repository;
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IRobotRepository _robotRepository;
        private readonly ILogRepository _logRepository;
        private readonly IAlertRepository _alertRepository;
        private readonly ILogService _logService;
        //private readonly IDestinationRepository _destinationRepository;

        // Enum status cho validate
        private readonly string[] ValidStatuses = { "pending", "in_progress", "awaiting_handover", "returning", "at_station", "completed", "canceled" };

        public TaskService(ITaskRepository repository, IMapper mapper, IUserRepository userRepository, IRobotRepository robotRepository, 
            ILogRepository logRepository, IAlertRepository alertRepository, ILogService logService)
        {
            _repository = repository;
            _mapper = mapper;
            _userRepository = userRepository;
            _robotRepository = robotRepository;
            _logRepository = logRepository;
            _alertRepository = alertRepository;
            _logService = logService;
            // _destinationRepository = destinationRepository;
        }

        public async Task<TaskResponseDto> ConfirmAsync(ulong id, ulong adminUserId, string adminUsername)
        {
            var task = await _repository.GetByIdAsync(id);
            if (task == null) throw new InvalidOperationException("Task not found");

            if (task.Status != "pending") throw new InvalidOperationException("Task must be pending to confirm");

            var adminUser = await _userRepository.GetByIdAsync(adminUserId);
            if (adminUser?.Role != "admin") throw new UnauthorizedAccessException("Only admin can confirm");

            var confirmLog = new Log
            {
                RobotId = task.RobotId,
                TaskId = id,
                LogType = "info",
                Message = $"Task {id} confirmed by admin {adminUsername}. Starting robot execution.",
                CreatedAt = DateTime.UtcNow
            };
            await _logRepository.CreateAsync(confirmLog);

            task.Status = "in_progress";
            task.StartedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(id, task);

            var robot = await _robotRepository.GetByIdAsync(task.RobotId);
            if (robot != null && robot.BatteryPercent < 20)
            {
                var alert = new Alert
                {
                    RobotId = task.RobotId,
                    Severity = "high",
                    Category = "battery",
                    Status = "open",
                    Message = $"Low battery ({robot.BatteryPercent}%) during task {id} start.",
                    CreatedAt = DateTime.UtcNow
                };
                await _alertRepository.CreateAsync(alert); 

                var warningLog = new Log
                {
                    RobotId = task.RobotId,
                    TaskId = id,
                    LogType = "warning",
                    Message = "Low battery warning issued for task start.",
                    CreatedAt = DateTime.UtcNow
                };
                await _logRepository.CreateAsync(warningLog);
            }

            var fullTask = await _repository.GetByIdAsync(id);
            return _mapper.Map<TaskResponseDto>(fullTask);
        }

        public async Task<TaskResponseDto> CreateAsync(CreateTaskDto createTaskDto, ulong currentUserId)
        {
            // Validate robot 
            var robot = await _robotRepository.GetByIdAsync(createTaskDto.RobotId, includeCompartments: true);
            if (robot == null)
            {
                throw new InvalidOperationException("Robot not found");
            }

            // Validate user nếu assign
            if (createTaskDto.AssignedBy.HasValue)
            {
                var user = await _userRepository.GetByIdAsync(createTaskDto.AssignedBy.Value);
                if (user == null)
                {
                    throw new InvalidOperationException("Assigned user not found");
                }
            }

            // Tạo Task
            var task = _mapper.Map<Models.Entities.Task>(createTaskDto); // Map từ CreateTaskDto (kế thừa TaskDto)
            task.AssignedBy = currentUserId; // Tự động set AssignedBy = currentUserId
            task.Status = string.IsNullOrEmpty(createTaskDto.Status) ? "pending" : createTaskDto.Status;
            task.Priority = createTaskDto.Priority.ToString();
            task.CreatedAt = DateTime.UtcNow;
            task.UpdatedAt = DateTime.UtcNow;
            task.TotalErrors = 0;
            var createdTask = await _repository.CreateAsync(task);

            // Tạo TaskStops
            var createdStops = new List<TaskStop>();
            foreach (var stopDto in createTaskDto.TaskStops)
            {
                if (stopDto.DestinationId.HasValue)
                {
                    // Validate destination nếu cần (giả sử có _destinationRepository)
                    // var dest = await _destinationRepository.GetByIdAsync(stopDto.DestinationId.Value);
                    // if (dest == null) throw new InvalidOperationException($"Destination {stopDto.DestinationId} not found");
                }

                var taskStop = _mapper.Map<TaskStop>(stopDto);
                taskStop.TaskId = createdTask.Id;
                taskStop.CreatedAt = DateTime.UtcNow;
                taskStop.UpdatedAt = DateTime.UtcNow;
                var createdStop = await _repository.CreateTaskStopAsync(taskStop);
                createdStops.Add(createdStop);
            }

            // Gợi ý gán compartments (mở rộng: dựa trên stops và available compartments của robot)
            var suggestedAssignments = new List<CompartmentAssignment>();
            var availableCompartments = robot.RobotCompartments.Where(c => c.IsActive == true && c.Status == "locked").ToList(); // Available: active và locked
            if (availableCompartments.Any())
            {
                for (int i = 0; i < createdStops.Count; i++)
                {
                    var stop = createdStops[i];
                    var compartment = availableCompartments[i % availableCompartments.Count]; // Round-robin gán

                    var assignment = new CompartmentAssignment
                    {
                        TaskId = createdTask.Id,
                        StopId = stop.Id,
                        CompartmentId = compartment.Id,
                        ItemDesc = $"Item for stop {stop.SeqNo}: {stop.CustomName ?? "General delivery"}", // Dựa trên stop, hoặc từ destination
                        Status = "pending", // Default
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                   
                }
            }
            else
            {
                // Log warning nếu không có compartment available
                var log = new Log
                {
                    RobotId = robot.Id,
                    TaskId = task.Id,
                    LogType = "warning",
                    Message = "No available compartments for task",
                    CreatedAt = DateTime.UtcNow
                };

                await _logRepository.CreateAsync(log);
            }

            // Reload full task với stops và assignments để response
            var fullTask = await _repository.GetByIdAsync(createdTask.Id);
            var response = _mapper.Map<TaskResponseDto>(fullTask);
            response.SuggestedCompartments = _mapper.Map<List<CompartmentAssignmentDto>>(suggestedAssignments); 

            return response;
        }

        public async Task<bool> DeleteAsync(ulong id)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                return false;
            }

            if (existing.Status == "completed")
            {
                throw new InvalidOperationException("Cannot cancel completed task");
            }

            return await _repository.CancelAsync(id);
        }

        public async Task<IEnumerable<TaskResponseDto>> GetAllAsync(string? priority = null)
        {
            var tasks = await _repository.GetAllAsync(priority);
            return _mapper.Map<IEnumerable<TaskResponseDto>>(tasks);
        }

        public async Task<IEnumerable<TaskResponseDto>> GetByAssignedByAsync(ulong assignedById)
        {
            var user = await _userRepository.GetByIdAsync(assignedById);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            var tasks = await _repository.GetByAssignedByAsync(assignedById);
            return _mapper.Map<IEnumerable<TaskResponseDto>>(tasks);
        }

        public async Task<TaskResponseDto?> GetByIdAsync(ulong id)
        {
            var task = await _repository.GetByIdAsync(id);
            return task != null ? _mapper.Map<TaskResponseDto>(task) : null;
        }

        public async Task<IEnumerable<TaskReportDto>> GetTaskReportAsync(ulong? robotId = null, DateTime? startDate = null, DateTime? endDate = null)
        {
            return await _repository.GetTaskReportAsync(robotId, startDate, endDate);
        }

        public async Task<int> SchedulePendingTasksAsync()
        {
            var pendingTasks = await _repository.GetPendingForSchedulingAsync();
            var availableRobots = await _robotRepository.GetAllAsync("at_station"); // Idle robots
            var assignedCount = 0;
            foreach (var task in pendingTasks.OrderBy(t => t.Priority == "Critical" ? 0 : t.Priority == "Urgent" ? 1 : 2)) // Prioritize
            {
                if (availableRobots.Any())
                {
                    var robot = availableRobots.First(); // Simple round-robin, enhance with load
                    task.RobotId = robot.Id;
                    task.Status = "in_progress"; // Or "scheduled"
                    await _repository.UpdateAsync(task.Id, task);
                    assignedCount++;
                    await _logService.CreateAsync(new LogDto
                    {
                        RobotId = robot.Id,
                        TaskId = task.Id,
                        LogType = "info",
                        Message = $"Auto-assigned task {task.Id} to robot {robot.Code}"
                    });
                }
            }
            return assignedCount;
        }

        public async Task<TaskResponseDto?> SetPriorityAsync(ulong id, TaskPriorityDto priorityDto)
        {
            var updated = await _repository.UpdatePriorityAsync(id, priorityDto.Priority);
            if (updated == null)
            {
                return null;
            }

            await _logService.CreateAsync(new LogDto
            {
                RobotId = updated.RobotId,
                TaskId = id,
                LogType = "info",
                Message = $"Task priority updated to {priorityDto.Priority}"
            });
            return _mapper.Map<TaskResponseDto>(updated);
        }

        public async Task<TaskResponseDto> SubmitAsync(ulong id, SubmitTaskDto submitDto, ulong currentUserId, string currentUsername)
        {
            var task = await _repository.GetByIdAsync(id);
            if (task == null) throw new InvalidOperationException("Task not found");

            if (!task.AssignedBy.HasValue || task.AssignedBy.Value != currentUserId) throw new UnauthorizedAccessException("Only the task creator can submit");

            if (task.Status != "pending") throw new InvalidOperationException("Task must be pending to submit");

            var logMessage = $"Task {id} submitted by user {currentUsername} for admin confirmation.";
            if (!string.IsNullOrEmpty(submitDto.Message)) logMessage += $" Additional note: {submitDto.Message}";

            var submitLog = new Log
            {
                RobotId = task.RobotId,
                TaskId = id,
                LogType = "info",
                Message = logMessage,
                CreatedAt = DateTime.UtcNow
            };
            await _logRepository.CreateAsync(submitLog);

            task.UpdatedAt = DateTime.UtcNow;
            await _repository.UpdateAsync(id, task);

            return _mapper.Map<TaskResponseDto>(task);
        }

        public async Task<TaskResponseDto?> UpdateAsync(ulong id, TaskDto taskDto)
        {
            // Validate status enum
            if (!ValidStatuses.Contains(taskDto.Status))
            {
                throw new ArgumentException($"Trạng thái: {taskDto.Status} không hợp lệ. Phải là một trong các trạng thái sau: {string.Join(", ", ValidStatuses)}");
            }

            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Task not found");
            }

            if (existing.Status == "completed" || existing.Status == "canceled")
            {
                throw new InvalidOperationException("Cannot update completed or canceled task");
            }

            // Validate robot nếu thay đổi
            var robot = await _robotRepository.GetByIdAsync(taskDto.RobotId);
            if (robot == null)
            {
                throw new InvalidOperationException("Robot not found");
            }

            // Validate user nếu thay đổi người giao task
            if (taskDto.AssignedBy.HasValue)
            {
                var user = await _userRepository.GetByIdAsync(taskDto.AssignedBy.Value);
                if (user == null)
                {
                    throw new InvalidOperationException("Assigned user not found");
                }
            }

            var task = _mapper.Map<Models.Entities.Task>(taskDto);
            task.Id = id;
            task.Priority = taskDto.Priority.ToString();
            task.UpdatedAt = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(id, task);
            return updated != null ? _mapper.Map<TaskResponseDto>(updated) : null;
        }

        public async Task<TaskResponseDto> UpdateTaskProgressAsync(ulong taskId, UpdateProgressDto progressDto)
        {
            var updated = await _repository.UpdateTaskProgressAsync(taskId, progressDto.SeqNo, progressDto.StopStatus, progressDto.DurationS);
            if (updated == null) throw new InvalidOperationException("Task not found");

            var log = new Log
            {
                RobotId = updated.RobotId,
                TaskId = taskId,
                StopId = (ulong?)progressDto.SeqNo, // StopId dựa trên seqNo
                LogType = progressDto.StopStatus == "delivered" ? "success" : "warning",
                Message = $"Stop {progressDto.SeqNo} updated to {progressDto.StopStatus} for task {taskId}. Duration: {progressDto.DurationS}s",
                CreatedAt = DateTime.UtcNow
            };
            await _logRepository.CreateAsync(log);

            return _mapper.Map<TaskResponseDto>(updated);
        }
    }
}
