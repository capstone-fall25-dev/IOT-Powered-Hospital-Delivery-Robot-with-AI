using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _repo;
        private readonly IRobotRepository _repoRobot;
        private readonly IRobotCompartmentRepository _repoRobotCom;
        private readonly IPatientRepository _repoPatient;
        private readonly IHubContext<TaskHub> _taskHub;

        public TaskService(
            ITaskRepository repo,
            IRobotRepository repoRobot,
            IRobotCompartmentRepository repoRobotCom,
            IPatientRepository repoPatient,
            IHubContext<TaskHub> taskHub)
        {
            _repo = repo;
            _repoRobot = repoRobot;
            _repoRobotCom = repoRobotCom;
            _repoPatient = repoPatient;
            _taskHub = taskHub;
        }

        // ======================================================================
        // GET LIST
        // ======================================================================
        public async Task<IEnumerable<TaskListItemDto>> GetAllAsync(TaskFilterDto? filter)
        {
            var tasks = await _repo.GetListAsync(filter);

            return tasks.Select(t => new TaskListItemDto
            {
                Id = t.Id,
                RobotName = t.Robot?.Name ?? "",
                AssignedBy = t.AssignedByNavigation?.FullName ?? "",
                Status = t.Status,
                Priority = Enum.TryParse<TaskPriority>(t.Priority, out var p) ? p : TaskPriority.Normal,
                CreatedAt = t.CreatedAt,
                ScheduledStartAt = t.ScheduledStartAt,

                TotalStops = t.TaskStops.Count,
                FirstDestination = t.TaskStops.OrderBy(s => s.SeqNo).FirstOrDefault()?.Destination?.Name ?? "",

                Patients = t.TaskStops
                    .GroupBy(s => s.PatientId)
                    .Select(g => new PatientStopSummaryDto
                    {
                        PatientName = g.First().Patient?.FullName ?? "",
                        MedicineSummary = string.Join("; ", g
                            .SelectMany(s => s.CompartmentAssignments)
                            .Select(a => a.ItemDesc)
                        )
                    }).ToList()
            });
        }

        // ======================================================================
        // GET DETAIL
        // ======================================================================
        public async Task<TaskDetailDto?> GetByIdAsync(ulong id)
        {
            var task = await _repo.GetByIdAsync(id);
            return task == null ? null : MapToDetail(task);
        }

        // ======================================================================
        // CREATE TASK
        // ======================================================================
        public async Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, ulong currentUserId)
        {
            using var transaction = await _repo.BeginTransactionAsync();

            try
            {
                // Validate map & robot
                var map = await _repo.GetMapAsync(dto.MapId)
                    ?? throw new InvalidOperationException("Bản đồ không tồn tại.");

                var robot = await _repo.GetRobotAsync(dto.RobotId)
                    ?? throw new InvalidOperationException("Robot không tồn tại.");

                // Ensure robot matches the map
                if (robot.MapId != dto.MapId)
                {
                    var updated = await _repoRobot.AssignMapToRobotAsync(robot.Id, dto.MapId);
                    if (updated == null)
                        throw new InvalidOperationException("Không thể gán map mới cho robot.");
                }

                // Robot must be at_station to accept task
                if (robot.Status != "at_station")
                    throw new InvalidOperationException(
                        $"Robot {robot.Name} đang ở trạng thái '{robot.Status}', không thể nhận nhiệm vụ mới."
                    );

                // Create task
                var task = new Models.Entities.Task
                {
                    MapId = dto.MapId,
                    RobotId = dto.RobotId,
                    AssignedBy = currentUserId,
                    Status = "pending",
                    Priority = dto.Priority.ToString(),
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    ScheduledStartAt = dto.ScheduledStartAt
                };

                task = await _repo.CreateAsync(task);

                // Create task stops
                foreach (var s in dto.Stops.OrderBy(s => s.SeqNo))
                {
                    var comp = await _repo.GetCompartmentAsync(s.CompartmentId)
                        ?? throw new InvalidOperationException($"Khoang {s.CompartmentId} không tồn tại.");

                    // Check compartment is free
                    if (await _repo.IsCompartmentBusyAsync(s.CompartmentId))
                        throw new InvalidOperationException($"Khoang {s.CompartmentId} đang được sử dụng.");

                    if (comp.Status == "locked")
                        throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang bị khóa.");

                    // Validate category
                    if (comp.CategoryId != null && comp.CategoryId != s.CategoryId)
                        throw new InvalidOperationException(
                            $"Khoang {comp.CompartmentCode} chỉ hỗ trợ Category {comp.CategoryId}."
                        );

                    if (comp.CategoryId == null)
                        await _repoRobotCom.AssignCategoryToCompartment(comp.Id, s.CategoryId);

                    // Validate patient
                    if (comp.PatientId != null && comp.PatientId != s.PatientId)
                        throw new InvalidOperationException(
                            $"Khoang {comp.CompartmentCode} đang gắn với bệnh nhân {comp.PatientId}."
                        );

                    if (comp.PatientId == null)
                        await _repoRobotCom.AssignPatientToCompartment(comp.Id, s.PatientId);

                    var rx = await _repo.GetLatestPrescriptionForPatientAsync(s.PatientId)
                        ?? throw new InvalidOperationException($"Bệnh nhân {s.PatientId} chưa có đơn thuốc.");

                    var patient = await _repoPatient.GetByIdAsync(s.PatientId)
                        ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân.");

                    string autoName = $"{patient.FullName} - {patient.PatientCode} - {rx.PrescriptionCode}";
                    autoName += " - " + string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));

                    var finalName = string.IsNullOrWhiteSpace(s.CustomName)
                        ? autoName
                        : s.CustomName.Trim();

                    var stop = new TaskStop
                    {
                        TaskId = task.Id,
                        SeqNo = s.SeqNo,
                        DestinationId = s.DestinationId,
                        PatientId = s.PatientId,
                        CustomName = finalName,
                        Status = "pending",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };

                    stop = await _repo.CreateStopAsync(stop);

                    string itemDesc = string.IsNullOrWhiteSpace(s.ItemDesc)
                        ? $"RX#{rx.PrescriptionCode}: " +
                          string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"))
                        : s.ItemDesc.Trim();

                    await _repo.CreateAssignmentAsync(new CompartmentAssignment
                    {
                        TaskId = task.Id,
                        StopId = stop.Id,
                        CompartmentId = s.CompartmentId,
                        ItemDesc = itemDesc,
                        Status = "pending",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                // Auto start or schedule
                if (!task.ScheduledStartAt.HasValue || task.ScheduledStartAt <= DateTime.UtcNow)
                {
                    task.Status = "in_progress";
                    task.UpdatedAt = DateTime.UtcNow;

                    await _repo.UpdateAsync(task.Id, task);

                    robot.Status = "transporting";
                    await _repo.UpdateRobotStatusAsync(robot.Id, robot.Status);
                }
                else
                {
                    await _repo.UpdateAsync(task.Id, task);
                }

                await transaction.CommitAsync();

                var result = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(result!);

                await _taskHub.Clients.All.SendAsync("TaskCreated", response);

                return response;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException($"Tạo nhiệm vụ thất bại: {ex.Message}");
            }
        }

        // ======================================================================
        // GET EDIT DATA
        // ======================================================================
        public async Task<TaskEditDto?> GetEditDataAsync(ulong id)
        {
            var task = await _repo.GetByIdAsync(id);
            if (task == null) return null;

            return MapToEdit(task);
        }

        // ======================================================================
        // UPDATE TASK
        // ======================================================================
        public async Task<TaskResponseDto?> UpdateAsync(ulong id, UpdateTaskDto dto)
        {
            using var transaction = await _repo.BeginTransactionAsync();

            try
            {
                var task = await _repo.GetByIdAsync(id)
                    ?? throw new InvalidOperationException("Không tìm thấy nhiệm vụ.");

                // ------------------------------
                // 1. CHANGE ROBOT
                // ------------------------------
                Robot? currentRobot;

                if (dto.RobotId.HasValue && dto.RobotId.Value != task.RobotId)
                {
                    var oldRobot = await _repo.GetRobotAsync(task.RobotId)
                        ?? throw new InvalidOperationException("Robot cũ không tồn tại.");

                    var newRobot = await _repo.GetRobotAsync(dto.RobotId.Value)
                        ?? throw new InvalidOperationException("Robot mới không tồn tại.");

                    if (newRobot.Status != "at_station")
                        throw new InvalidOperationException("Robot mới đang bận.");

                    oldRobot.Status = "at_station";
                    await _repo.UpdateRobotStatusAsync(oldRobot.Id, oldRobot.Status);

                    task.RobotId = dto.RobotId.Value;

                    newRobot.Status = "transporting";
                    await _repo.UpdateRobotStatusAsync(newRobot.Id, newRobot.Status);

                    currentRobot = newRobot;
                }
                else
                {
                    currentRobot = await _repo.GetRobotAsync(task.RobotId)
                        ?? throw new InvalidOperationException("Robot không tồn tại.");
                }

                // ------------------------------
                // 2. CHANGE MAP
                // ------------------------------
                if (dto.MapId.HasValue && dto.MapId.Value != task.MapId)
                {
                    var map = await _repo.GetMapAsync(dto.MapId.Value)
                        ?? throw new InvalidOperationException("Bản đồ không tồn tại.");

                    task.MapId = dto.MapId.Value;

                    if (currentRobot.MapId != dto.MapId.Value)
                    {
                        var updated = await _repoRobot.AssignMapToRobotAsync(currentRobot.Id, dto.MapId.Value);
                        if (updated == null)
                            throw new InvalidOperationException("Không thể gán map mới cho robot.");
                    }
                }
                else
                {
                    if (currentRobot.MapId != task.MapId)
                    {
                        var updated = await _repoRobot.AssignMapToRobotAsync(currentRobot.Id, task.MapId!.Value);
                        if (updated == null)
                            throw new InvalidOperationException("Không thể gán map hiện tại cho robot.");
                    }
                }

                // ------------------------------
                // 3. HEADER UPDATE
                // ------------------------------
                if (dto.Priority.HasValue)
                    task.Priority = dto.Priority.ToString();

                if (dto.ScheduledStartAt.HasValue)
                    task.ScheduledStartAt = dto.ScheduledStartAt.Value;

                bool taskStatusManuallyChanged =
                    dto.Status != null &&       // FE có gửi lên
                    dto.Status.Trim().ToLower() != task.Status.ToLower();   // Và FE ĐÃ THAY ĐỔI trạng thái

                // ------------------------------
                // 3.1 UPDATE TASK STATUS
                // ------------------------------
                if (!string.IsNullOrWhiteSpace(dto.Status))
                {
                    string newStatus = dto.Status.Trim().ToLower();
                    string currentStatus = task.Status.ToLower();

                    // Validate status change
                    if (!AllowedStatusForEdit.Contains(currentStatus))
                        throw new InvalidOperationException(
                            $"Không thể update trạng thái khi task đang ở '{task.Status}'."
                        );

                    if (!ValidTaskStatuses.Contains(newStatus))
                        throw new InvalidOperationException($"Status '{newStatus}' không hợp lệ.");

                    task.Status = newStatus;
                    task.UpdatedAt = DateTime.UtcNow;
                    taskStatusManuallyChanged = true;

                    string stopStatus = MapTaskStatusToTaskStopStatus(newStatus);

                    foreach (var stop in task.TaskStops)
                    {
                        stop.Status = stopStatus;
                        stop.UpdatedAt = DateTime.UtcNow;

                        foreach (var assign in stop.CompartmentAssignments)
                        {
                            assign.Status = stopStatus;
                            assign.UpdatedAt = DateTime.UtcNow;
                        }
                    }

                    // Robot về trạm khi task kết thúc
                    if (newStatus is "completed" or "failed" or "canceled")
                    {
                        await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");
                    }
                }

                // ------------------------------
                // 4. UPDATE STOPS
                // ------------------------------
                if (dto.Stops != null)
                {
                    foreach (var sDto in dto.Stops)
                    {
                        var stop = task.TaskStops.FirstOrDefault(x => x.Id == sDto.StopId)
                            ?? throw new InvalidOperationException($"Không tìm thấy Stop {sDto.StopId}");

                        // 4.1 Update Stop Status
                        if (!string.IsNullOrWhiteSpace(sDto.Status))
                        {
                            var newStopStatus = sDto.Status.Trim().ToLower();

                            if (!ValidStopStatuses.Contains(newStopStatus))
                                throw new InvalidOperationException($"Stop status '{newStopStatus}' không hợp lệ.");

                            stop.Status = newStopStatus;
                            stop.UpdatedAt = DateTime.UtcNow;

                            foreach (var assign in stop.CompartmentAssignments)
                            {
                                assign.Status = newStopStatus;
                                assign.UpdatedAt = DateTime.UtcNow;
                            }
                        }

                        // 4.2 Update stop info
                        stop.SeqNo = sDto.SeqNo;
                        stop.DestinationId = sDto.DestinationId;
                        stop.PatientId = sDto.PatientId;
                        stop.UpdatedAt = DateTime.UtcNow;

                        var assignment = stop.CompartmentAssignments.FirstOrDefault();

                        bool changingCompartment =
                            assignment == null || assignment.CompartmentId != sDto.CompartmentId;

                        if (changingCompartment)
                        {
                            if (assignment != null)
                                await _repoRobotCom.ReleaseCompartmentAsync(assignment.CompartmentId);

                            var newComp = await _repo.GetCompartmentAsync(sDto.CompartmentId)
                                ?? throw new InvalidOperationException("Khoang không tồn tại.");

                            if (newComp.Status == "locked")
                                throw new InvalidOperationException($"Khoang {newComp.CompartmentCode} đang bị khóa.");

                            if (newComp.CategoryId != null && newComp.CategoryId != sDto.CategoryId)
                                throw new InvalidOperationException(
                                    $"Khoang {newComp.CompartmentCode} chỉ hỗ trợ Category {newComp.CategoryId}."
                                );

                            if (newComp.CategoryId == null)
                                await _repoRobotCom.AssignCategoryToCompartment(newComp.Id, sDto.CategoryId);

                            if (newComp.PatientId != null && newComp.PatientId != sDto.PatientId)
                                throw new InvalidOperationException(
                                    $"Khoang {newComp.CompartmentCode} đang gắn bệnh nhân khác."
                                );

                            if (newComp.PatientId == null)
                                await _repoRobotCom.AssignPatientToCompartment(newComp.Id, sDto.PatientId);

                            if (assignment == null)
                            {
                                assignment = new CompartmentAssignment
                                {
                                    TaskId = task.Id,
                                    StopId = stop.Id,
                                    CompartmentId = sDto.CompartmentId,
                                    Status = stop.Status,
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };

                                await _repo.CreateAssignmentAsync(assignment);
                                stop.CompartmentAssignments.Add(assignment);
                            }
                            else
                            {
                                assignment.CompartmentId = sDto.CompartmentId;
                                assignment.UpdatedAt = DateTime.UtcNow;
                            }
                        }

                        // CustomName
                        if (!string.IsNullOrWhiteSpace(sDto.CustomName))
                            stop.CustomName = sDto.CustomName.Trim();

                        // ItemDesc
                        if (assignment != null)
                        {
                            if (!string.IsNullOrWhiteSpace(sDto.ItemDesc))
                            {
                                assignment.ItemDesc = sDto.ItemDesc.Trim();
                            }

                            assignment.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }

                // ==================================================================
                // 5. AUTO-COMPLETE IF ALL STOPS DELIVERED
                // ==================================================================
                bool allDelivered = task.TaskStops.Any() &&
                    task.TaskStops.All(s =>
                        string.Equals(s.Status, "delivered", StringComparison.OrdinalIgnoreCase));

                if (!taskStatusManuallyChanged && allDelivered)
                {
                    task.Status = "completed";
                    task.UpdatedAt = DateTime.UtcNow;

                    await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");
                }

                // ==================================================================
                // 6. RELEASE COMPARTMENTS WHEN TASK FINISHES
                // ==================================================================
                if (task.Status == "completed" ||
                    task.Status == "failed" ||
                    task.Status == "canceled")
                {
                    foreach (var stop in task.TaskStops)
                    {
                        foreach (var assign in stop.CompartmentAssignments)
                        {
                            await _repoRobotCom.ReleaseCompartmentAsync(assign.CompartmentId);
                        }
                    }
                }

                // Save, commit
                await _repo.SaveChangesAsync();
                await transaction.CommitAsync();

                var updatedTask = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(updatedTask!);

                await _taskHub.Clients.All.SendAsync("TaskUpdated", response);

                return response;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException($"Cập nhật nhiệm vụ thất bại: {ex.Message}");
            }
        }

        // ======================================================================
        // DELETE
        // ======================================================================
        public Task<bool> DeleteAsync(ulong id) => _repo.DeleteAsync(id);

        // ======================================================================
        // DTO MAPPERS
        // ======================================================================
        private TaskResponseDto MapToResponse(Models.Entities.Task task)
        {
            return new TaskResponseDto
            {
                Id = task.Id,
                RobotName = task.Robot?.Name,
                Status = task.Status,
                Priority = Enum.TryParse<TaskPriority>(task.Priority, out var p) ? p : TaskPriority.Normal,
                CreatedAt = task.CreatedAt,
                ScheduledStartAt = task.ScheduledStartAt,
                AssignedByEmail = task.AssignedByNavigation?.Email,
                AssignedByFullName = task.AssignedByNavigation?.FullName,
                Stops = task.TaskStops.OrderBy(s => s.SeqNo).Select(s =>
                {
                    var assign = s.CompartmentAssignments.FirstOrDefault();
                    var rxCode = assign?.ItemDesc.Split(':').FirstOrDefault()?.Replace("RX#", "")?.Trim() ?? "";

                    var rx = _repo.GetPrescriptionByCodeAsync(rxCode).Result;

                    return new TaskStopResponseDto
                    {
                        SeqNo = s.SeqNo,
                        PatientName = s.Patient?.FullName,
                        DestinationName = s.Destination?.Name,
                        CompartmentCode = assign?.Compartment?.CompartmentCode,
                        Prescription = rx == null
                            ? null
                            : new PrescriptionSummaryDto
                            {
                                Code = rx.PrescriptionCode,
                                Items = rx.PrescriptionItems.Select(i => new PrescriptionItemResponseDto
                                {
                                    Id = i.Id,
                                    MedicineCode = i.Medicine.MedicineCode,
                                    MedicineName = i.Medicine.Name,
                                    Quantity = i.Quantity,
                                    Dosage = i.Dosage,
                                    Instructions = i.Instructions
                                }).ToList()
                            }
                    };
                }).ToList()
            };
        }

        private TaskDetailDto MapToDetail(Models.Entities.Task task)
        {
            return new TaskDetailDto
            {
                Id = task.Id,
                RobotName = task.Robot?.Name ?? "",
                Status = task.Status,
                Priority = Enum.TryParse<TaskPriority>(task.Priority, out var p) ? p : TaskPriority.Normal,
                CreatedAt = task.CreatedAt,
                ScheduledStartAt = task.ScheduledStartAt,
                AssignedByEmail = task.AssignedByNavigation?.Email,
                AssignedByFullName = task.AssignedByNavigation?.FullName,
                MapName = task.Map?.MapName,

                Stops = task.TaskStops.OrderBy(s => s.SeqNo).Select(s =>
                {
                    var assign = s.CompartmentAssignments.FirstOrDefault();
                    var rx = s.Patient?.Prescriptions?.OrderByDescending(x => x.CreatedAt).FirstOrDefault();

                    return new TaskDetailStopDto
                    {
                        StopId = s.Id,
                        SeqNo = s.SeqNo,

                        DestinationName = s.Destination?.Name ?? "",

                        PatientName = s.Patient?.FullName ?? "",
                        PatientCode = s.Patient?.PatientCode ?? "",
                        RoomNumber = s.Patient?.RoomNumber,
                        Department = s.Patient?.Department,

                        CompartmentCode = assign?.Compartment?.CompartmentCode ?? "",
                        CompartmentStatus = assign?.Compartment?.Status ?? "",
                        CompartmentCategory = assign?.Compartment?.Category?.Name,

                        ItemDesc = assign?.ItemDesc ?? "",
                        StopStatus = s.Status,
                        AssignmentStatus = s.Status,

                        Prescription = rx == null ? null : new PrescriptionFullDto
                        {
                            PrescriptionCode = rx.PrescriptionCode,
                            CreatedAt = rx.CreatedAt ?? DateTime.MinValue,
                            Status = rx.Status,

                            Items = rx.PrescriptionItems.Select(i => new PrescriptionItemResponseDto
                            {
                                Id = i.Id,
                                MedicineCode = i.Medicine.MedicineCode,
                                MedicineName = i.Medicine.Name,
                                Quantity = i.Quantity,
                                Dosage = i.Dosage,
                                Instructions = i.Instructions
                            }).ToList()
                        }
                    };
                }).ToList()
            };
        }

        private TaskEditDto MapToEdit(Models.Entities.Task task)
        {
            return new TaskEditDto
            {
                Id = task.Id,
                MapId = task.MapId ?? 0,
                RobotId = task.RobotId,
                Priority = Enum.TryParse<TaskPriority>(task.Priority, out var p) ? p : TaskPriority.Normal,
                ScheduledStartAt = task.ScheduledStartAt,
                Status = task.Status,
                Stops = task.TaskStops.OrderBy(s => s.SeqNo).Select(s =>
                {
                    var assign = s.CompartmentAssignments.FirstOrDefault();

                    return new TaskEditStopDto
                    {
                        StopId = s.Id,
                        SeqNo = s.SeqNo,
                        DestinationId = s.DestinationId ?? 0,
                        PatientId = s.PatientId ?? 0,
                        CategoryId = assign?.Compartment?.CategoryId ?? 0,
                        CompartmentId = assign?.CompartmentId ?? 0,
                        CustomName = s.CustomName,
                        ItemDesc = assign?.ItemDesc,
                        Status = s.Status
                    };
                }).ToList()
            };
        }

        // ======================================================================
        // STATIC SETTINGS
        // ======================================================================
        private static readonly HashSet<string> AllowedStatusForEdit = new()
        {
            "pending",
            "in_progress",
            "awaiting_handover",
            "returning",
            "at_station"
        };

        private static readonly HashSet<string> ValidTaskStatuses = new()
        {
            "pending",
            "in_progress",
            "awaiting_handover",
            "returning",
            "at_station",
            "completed",
            "failed",
            "canceled"
        };

        private static readonly HashSet<string> ValidStopStatuses = new()
        {
            "pending",
            "in_progress",
            "awaiting_handover",
            "delivered",
            "skipped",
            "failed"
        };

        private string MapTaskStatusToTaskStopStatus(string status)
        {
            return status.ToLower() switch
            {
                "completed" => "delivered",
                "failed" => "failed",
                "canceled" => "skipped",
                _ => "pending"
            };
        }

        public async Task<RunTaskInfoDto?> GetRunInfoAsync(ulong taskId)
        {
            var task = await _repo.GetTaskWithStopsAsync(taskId);
            if (task == null) return null;

            var stops = task.TaskStops.OrderBy(s => s.SeqNo).Select(s => new RunTaskStopDto
            {
                Order = s.SeqNo,
                DestinationId = s.DestinationId ?? 0,
                Name = s.Destination?.Name ?? "",
                X = s.Destination?.X ?? 0,
                Y = s.Destination?.Y ?? 0
            }).ToList();

            return new RunTaskInfoDto
            {
                TaskId = task.Id,
                RobotId = task.RobotId,
                MapId = task.MapId ?? 0,
                MapName = task.Map?.MapName ?? "",
                Stops = stops
            };
        }
        public async Task<bool> UpdateStopStatusAsync(ulong taskId, ulong stopId, string newStatus)
        {
            var task = await _repo.GetByIdAsync(taskId);
            if (task == null) throw new Exception("Task not found");

            var stop = task.TaskStops.FirstOrDefault(s => s.Id == stopId);
            if (stop == null) throw new Exception("Stop not found");

            // ✔ CHỈ UPDATE STOP — KHÔNG ĐỤNG TỚI CompartmentAssignment
            stop.Status = newStatus;
            stop.UpdatedAt = DateTime.UtcNow;

            // Nếu trạng thái delivered → chỉ update stop, không update compartments
            // Vì ENUM khác nhau

            await _repo.SaveChangesAsync();
            return true;
        }

        public async Task<StopUpdateResultDto> CompleteTaskAsync(ulong taskId)
        {
            var task = await _repo.GetByIdAsync(taskId);
            if (task == null)
                return new StopUpdateResultDto { Success = false, Message = "Task không tồn tại." };

            // Update all stops
            foreach (var stop in task.TaskStops)
            {
                stop.Status = "delivered";
                stop.UpdatedAt = DateTime.UtcNow;

                foreach (var assign in stop.CompartmentAssignments)
                {
                    assign.Status = "delivered";
                    assign.UpdatedAt = DateTime.UtcNow;
                }
            }

            // Task
            task.Status = "completed";
            task.UpdatedAt = DateTime.UtcNow;

            await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

            // Release all compartments
            foreach (var stop in task.TaskStops)
            {
                foreach (var a in stop.CompartmentAssignments)
                    await _repoRobotCom.ReleaseCompartmentAsync(a.CompartmentId);
            }

            await _repo.SaveChangesAsync();

            return new StopUpdateResultDto
            {
                Success = true,
                Task = MapToDetail(task)
            };
        }

    }
}


