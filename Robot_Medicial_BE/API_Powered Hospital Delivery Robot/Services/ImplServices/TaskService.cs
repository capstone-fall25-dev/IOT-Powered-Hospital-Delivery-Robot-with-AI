using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using System.ComponentModel.DataAnnotations;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _repository;
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IRobotRepository _robotRepository;
        private readonly ICompartmentAssignmentRepository _compartmentAssignmentRepository;
        private readonly ILogRepository _logRepository;
        private readonly IAlertRepository _alertRepository;
        private readonly ILogService _logService;
        private readonly IDestinationRepository _destinationRepository;

        // Enum status cho validate
        private readonly string[] ValidStatuses = { "pending", "in_progress", "awaiting_handover", "returning", "at_station", "completed", "canceled" };

        public TaskService(ITaskRepository repository, IMapper mapper, IUserRepository userRepository, IRobotRepository robotRepository,
            ICompartmentAssignmentRepository compartmentAssignmentRepository,
            ILogRepository logRepository, IAlertRepository alertRepository, ILogService logService, IDestinationRepository destinationRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _userRepository = userRepository;
            _robotRepository = robotRepository;
            _compartmentAssignmentRepository = compartmentAssignmentRepository;
            _logRepository = logRepository;
            _alertRepository = alertRepository;
            _logService = logService;
            _destinationRepository = destinationRepository;
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



        public async Task<TaskResponseDto> CreateAsync(CreateTaskDto1 createTaskDto, ulong currentUserId)
        {
            // === 1. Validate Robot ===
            var robot = await _robotRepository.GetByIdAsync(createTaskDto.RobotId, includeCompartments: true);
            if (robot == null)
                throw new InvalidOperationException("Robot not found");

            // === 2. Validate AssignedBy ===
            if (createTaskDto.AssignedBy.HasValue && createTaskDto.AssignedBy.Value != currentUserId)
            {
                var assignedUser = await _userRepository.GetByIdAsync(createTaskDto.AssignedBy.Value);
                if (assignedUser == null)
                    throw new InvalidOperationException("Assigned user not found");
            }

            // === 3. Tạo Task ===
            var task = new Models.Entities.Task
            {
                RobotId = createTaskDto.RobotId,
                AssignedBy = currentUserId,
                Status = string.IsNullOrWhiteSpace(createTaskDto.Status) ? "pending" : createTaskDto.Status.Trim(),
                Priority = createTaskDto.Priority.ToString(),
                MapId = createTaskDto.MapId,
                ScheduledStartAt = createTaskDto.ScheduledStartAt,
                TotalErrors = 0,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            var createdTask = await _repository.CreateAsync(task);

            // === 4. Lấy ngăn UNLOCKED ===
            var unlockedCompartments = robot.RobotCompartments
                .Where(c => c.IsActive == true && c.Status == "unlocked")
                .ToList();

            var lockedCompartmentIds = robot.RobotCompartments
                .Where(c => c.IsActive == true && c.Status == "locked")
                .Select(c => c.Id)
                .ToList();

            // === 5. Biến theo dõi ===
            var createdStops = new List<TaskStop>();
            var finalAssignments = new List<CompartmentAssignment>();
            var usedSeqNos = new HashSet<int>();
            int previousSeqNo = 0;

            int compartmentIndex = 0;
            var skippedDueToUserLocked = new List<int>(); // Stop bị bỏ vì user chọn locked
            var skippedDueToNoCompartment = new List<int>(); // Stop bị bỏ vì hết ngăn unlocked
            var messages = new List<string>();

            // === 6. Xử lý từng Stop ===
            foreach (var stopDto in createTaskDto.TaskStops.OrderBy(s => s.SeqNo))
            {
                // --- Validate SeqNo ---
                if (stopDto.SeqNo <= 0)
                    throw new ValidationException("SeqNo must be greater than 0.");
                if (stopDto.SeqNo <= previousSeqNo)
                    throw new ValidationException($"SeqNo {stopDto.SeqNo} must be greater than previous SeqNo {previousSeqNo}.");
                if (usedSeqNos.Contains(stopDto.SeqNo))
                    throw new ValidationException($"SeqNo {stopDto.SeqNo} is duplicated.");

                previousSeqNo = stopDto.SeqNo;
                usedSeqNos.Add(stopDto.SeqNo);

                // --- Validate Destination ---
                if (!stopDto.DestinationId.HasValue && string.IsNullOrWhiteSpace(stopDto.CustomName))
                    throw new ValidationException($"Stop SeqNo {stopDto.SeqNo}: Either DestinationId or CustomName is required.");

                if (stopDto.DestinationId.HasValue)
                {
                    var dest = await _destinationRepository.GetByIdAsync(stopDto.DestinationId.Value);
                    if (dest == null)
                        throw new InvalidOperationException($"Destination ID {stopDto.DestinationId} not found.");
                }

                // --- KIỂM TRA GÁN NGĂN ---
                ulong? assignedCompartmentId = null;
                bool skipStop = false;

                var userAssign = createTaskDto.CompartmentAssignments?
                    .FirstOrDefault(a => a.StopSeqNo == stopDto.SeqNo);

                if (userAssign != null)
                {
                    // Người dùng chọn ngăn
                    var isUnlocked = unlockedCompartments.Any(c => c.Id == userAssign.CompartmentId);
                    if (!isUnlocked)
                    {
                        // NGƯỜI DÙNG CHỌN LOCKED → BỎ QUA STOP HOÀN TOÀN
                        skippedDueToUserLocked.Add(stopDto.SeqNo);
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = robot.Id,
                            TaskId = createdTask.Id,
                            LogType = "warning",
                            Message = $"Stop {stopDto.SeqNo} skipped: User requested locked Compartment ID {userAssign.CompartmentId}.",
                            CreatedAt = DateTime.UtcNow
                        });
                        skipStop = true;
                    }
                    else
                    {
                        assignedCompartmentId = userAssign.CompartmentId;
                    }
                }
                else
                {
                    // TỰ ĐỘNG GÁN
                    if (compartmentIndex >= unlockedCompartments.Count)
                    {
                        skippedDueToNoCompartment.Add(stopDto.SeqNo);
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = robot.Id,
                            TaskId = createdTask.Id,
                            LogType = "info",
                            Message = $"Stop {stopDto.SeqNo} skipped: No more unlocked compartments.",
                            CreatedAt = DateTime.UtcNow
                        });
                        skipStop = true;
                    }
                    else
                    {
                        assignedCompartmentId = unlockedCompartments[compartmentIndex % unlockedCompartments.Count].Id;
                        compartmentIndex++;
                    }
                }

                // === BỎ QUA STOP NÀY HOÀN TOÀN ===
                if (skipStop) continue;

                // === CHỈ TẠO TASKSTOP NẾU CÓ NGĂN UNLOCKED ĐỂ GÁN ===
                var taskStop = new TaskStop
                {
                    TaskId = createdTask.Id,
                    SeqNo = stopDto.SeqNo,
                    DestinationId = stopDto.DestinationId,
                    CustomName = stopDto.CustomName?.Trim(),
                    Status = string.IsNullOrWhiteSpace(stopDto.Status) ? "pending" : stopDto.Status.Trim(),
                    EtaAt = stopDto.EtaAt,
                    PatientId = stopDto.PatientId,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var createdStop = await _repository.CreateTaskStopAsync(taskStop);
                createdStops.Add(createdStop);

                // === TẠO ASSIGNMENT ===
                string itemDesc = userAssign != null && !string.IsNullOrWhiteSpace(userAssign.ItemDesc)
                    ? userAssign.ItemDesc.Trim()
                    : $"Auto: Stop {stopDto.SeqNo} - {(stopDto.CustomName ?? "Delivery")}";

                var assignment = new CompartmentAssignment
                {
                    TaskId = createdTask.Id,
                    StopId = createdStop.Id,
                    CompartmentId = assignedCompartmentId.Value,
                    ItemDesc = itemDesc,
                    Status = "pending",
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var createdAssignment = await _compartmentAssignmentRepository.CreateAsync(assignment);
                finalAssignments.Add(createdAssignment);
            }

            // === 7. TẠO MESSAGE – ĐÚNG SỐ LƯỢNG STOP THÀNH CÔNG ===
            int successfulStops = createdStops.Count;

            if (successfulStops > 0)
            {
                messages.Add($"Task created successfully with {successfulStops} stop(s).");
            }
            else
            {
                messages.Add("Task created but no stops were assigned.");
            }

            if (lockedCompartmentIds.Any())
            {
                messages.Add($"Locked compartments {string.Join(", ", lockedCompartmentIds)} were completely ignored.");
            }

            if (skippedDueToUserLocked.Any())
            {
                messages.Add($"Skipped {skippedDueToUserLocked.Count} stop(s) [SeqNo: {string.Join(", ", skippedDueToUserLocked)}] because user requested locked compartment.");
            }

            if (skippedDueToNoCompartment.Any())
            {
                messages.Add($"Skipped {skippedDueToNoCompartment.Count} stop(s) [SeqNo: {string.Join(", ", skippedDueToNoCompartment)}] due to no available unlocked compartment.");
            }

            string finalMessage = string.Join(" ", messages);

            // === 8. Ghi log + Response ===
            await _logRepository.CreateAsync(new Log
            {
                RobotId = robot.Id,
                TaskId = createdTask.Id,
                LogType = "info",
                Message = finalMessage,
                CreatedAt = DateTime.UtcNow
            });

            var fullTask = await _repository.GetByIdAsync(createdTask.Id);
            if (fullTask == null)
                throw new InvalidOperationException("Failed to reload created task.");

            return new TaskResponseDto
            {
                Id = fullTask.Id,
                RobotId = fullTask.RobotId,
                RobotName = fullTask.Robot?.Name,
                AssignedBy = fullTask.AssignedBy,
                AssignedByUsername = fullTask.AssignedByNavigation?.Email,
                Status = fullTask.Status,
                Priority = Enum.Parse<TaskPriority>(fullTask.Priority, true),
                StartedAt = fullTask.StartedAt,
                CompletedAt = fullTask.CompletedAt,
                TotalDurationS = fullTask.TotalDurationS,
                TotalErrors = fullTask.TotalErrors,
                CreatedAt = fullTask.CreatedAt,
                UpdatedAt = fullTask.UpdatedAt,
                ScheduledStartAt = fullTask.ScheduledStartAt ?? default,
                Stops = fullTask.TaskStops
                    .OrderBy(s => s.SeqNo)
                    .Select(s => new TaskStopDto
                    {
                        Id = s.Id,
                        SeqNo = s.SeqNo,
                        DestinationId = s.DestinationId,
                        CustomName = s.CustomName,
                        Status = s.Status,
                        EtaAt = s.EtaAt,
                        ArrivedAt = s.ArrivedAt,
                        HandedOverAt = s.HandedOverAt,
                        PatientId = s.PatientId,
                    }).ToList(),
                SuggestedCompartments = finalAssignments.Select(a => new CompartmentAssignmentDto
                {
                    Id = a.Id,
                    CompartmentId = a.CompartmentId,
                    StopId = a.StopId,
                    TaskId = a.TaskId,
                    Status = a.Status ?? "pending"
                }).ToList(),
                Message = finalMessage
            };
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
