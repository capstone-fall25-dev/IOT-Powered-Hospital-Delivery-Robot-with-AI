using API_Powered_Hospital_Delivery_Robot.Helpers;
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
        private readonly ITaskHistoryService _taskHistoryService;
        private readonly ILogRepository _logRepository;

        public TaskService(
            ITaskRepository repo,
            IRobotRepository repoRobot,
            IRobotCompartmentRepository repoRobotCom,
            IPatientRepository repoPatient,
            IHubContext<TaskHub> taskHub,
            ITaskHistoryService taskHistoryService,
            ILogRepository logRepository)
        {
            _repo = repo;
            _repoRobot = repoRobot;
            _repoRobotCom = repoRobotCom;
            _repoPatient = repoPatient;
            _taskHub = taskHub;
            _taskHistoryService = taskHistoryService;
            _logRepository = logRepository;
        }

        // ======================================================================
        // GET LIST
        // ======================================================================
        public async Task<IEnumerable<TaskListItemDto>> GetAllAsync(TaskFilterDto? filter)
        {
            var tasks = await _repo.GetListAsync(filter);

            return tasks
            .OrderByDescending(t => t.Id)
                .Select(t => new TaskListItemDto
                {
                    Id = t.Id,
                    RobotName = t.Robot?.Name ?? "",
                    AssignedBy = t.AssignedByNavigation?.FullName ?? "",
                    Status = t.Status,
                    Priority = Enum.TryParse<TaskPriority>(t.Priority, out var p) ? p : TaskPriority.Normal,
                    CreatedAt = t.CreatedAt,
                    ScheduledStartAt = t.ScheduledStartAt,
                    StartedAt = t.StartedAt,
                    CompletedAt = t.CompletedAt,
                    TotalStops = t.TaskStops.Count,
                    CompletedStops = t.TaskStops.Count(s => string.Equals(s.Status, "delivered", StringComparison.OrdinalIgnoreCase)),
                    FirstDestination = t.TaskStops.OrderBy(s => s.SeqNo).FirstOrDefault()?.Destination?.Name ?? "",

                    Patients = t.TaskStops
                    .GroupBy(s => s.PatientId)
                    .Select(g =>
                    {
                        var firstStop = g.First();
                        var itemDescs = g
                            .SelectMany(s => s.CompartmentAssignments)
                            .Select(a => a.ItemDesc)
                            .Where(desc => !string.IsNullOrWhiteSpace(desc))
                            .ToList();
                        var itemDesc = itemDescs.Any() ? string.Join("; ", itemDescs) : null;

                        return new PatientStopSummaryDto
                        {
                            PatientName = firstStop.Patient?.FullName ?? "",
                            MedicineSummary = itemDesc ?? "", // Giữ lại để tương thích
                            CustomName = firstStop.CustomName,
                            ItemDesc = itemDesc
                        };
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

                // Robot must have at least 1 compartment to deliver
                if (robot.RobotCompartments == null || robot.RobotCompartments.Count == 0)
                {
                    throw new InvalidOperationException(
                        $"Robot '{robot.Name}' không có khoang chứa, không thể giao nhiệm vụ.");
                }

                if (robot.MapId != dto.MapId)
                {
                    throw new InvalidOperationException(
                        $"Robot '{robot.Name ?? robot.Code}' không thuộc bản đồ đã chọn. " +
                        $"Vui lòng chọn robot phù hợp với Map ID = {dto.MapId}");
                }

                // Robot must be at_station to accept task
                if (robot.Status != "at_station")
                    throw new InvalidOperationException(
                        $"Robot {robot.Name} đang ở trạng thái '{robot.Status}', không thể nhận nhiệm vụ mới."
                    );

                // Kiểm tra robot đã có task pending chưa (mỗi robot chỉ có thể có 1 task pending tại một thời điểm)
                if (await _repo.HasRobotPendingTaskAsync(dto.RobotId))
                    throw new InvalidOperationException(
                        $"Robot {robot.Name ?? robot.Code} đã được assign cho một nhiệm vụ khác đang ở trạng thái pending. " +
                        "Vui lòng chọn robot khác hoặc đợi nhiệm vụ hiện tại hoàn thành/hủy."
                    );

                // Create task
                var task = new Models.Entities.Task
                {
                    MapId = dto.MapId,
                    RobotId = dto.RobotId,
                    AssignedBy = currentUserId,
                    Status = "pending",
                    Priority = dto.Priority.ToString(),
                    CreatedAt = DateTimeHelper.Now(),
                    UpdatedAt = DateTimeHelper.Now(),
                    ScheduledStartAt = dto.ScheduledStartAt
                };

                task = await _repo.CreateAsync(task);

                // Lưu stopId đầu tiên để dùng cho log
                ulong? firstStopId = null;

                // Create task stops
                foreach (var s in dto.Stops.OrderBy(s => s.SeqNo))
                {
                    var comp = await _repo.GetCompartmentAsync(s.CompartmentId)
                        ?? throw new InvalidOperationException($"Khoang {s.CompartmentId} không tồn tại.");

                    // Kiểm tra compartment status trước
                    if (comp.Status == "locked")
                        throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang bị khóa.");

                    // Check compartment is free (đang được sử dụng bởi task active)
                    if (await _repo.IsCompartmentBusyAsync(s.CompartmentId))
                        throw new InvalidOperationException(
                            $"Khoang {comp.CompartmentCode ?? s.CompartmentId.ToString()} đang được sử dụng bởi một nhiệm vụ khác. " +
                            "Vui lòng chọn ngăn chứa khác hoặc đợi nhiệm vụ hiện tại hoàn thành."
                        );

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

                    var patient = await _repoPatient.GetByIdAsync(s.PatientId)
                        ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân.");

                    // Đảm bảo Category được load để lấy tên loại ngăn chứa
                    CompartmentCategory? category = comp.Category;
                    if (category == null)
                    {
                        var compWithCategory = await _repoRobotCom.GetByIdAsync(s.CompartmentId);
                        category = compWithCategory?.Category;
                    }

                    // CustomName: Nếu user nhập → dùng giá trị user nhập, nếu không → Tên bệnh nhân + mã bệnh nhân + loại ngăn chứa
                    var finalName = string.IsNullOrWhiteSpace(s.CustomName)
                        ? $"{patient.FullName} - {patient.PatientCode} - {category?.Name ?? "N/A"}"
                        : s.CustomName.Trim();

                    // ItemDesc: Nếu user nhập → dùng giá trị user nhập, nếu không → null (lưu dưới dạng empty string)
                    var finalItemDesc = string.IsNullOrWhiteSpace(s.ItemDesc)
                        ? ""
                        : s.ItemDesc.Trim();

                    var stop = new TaskStop
                    {
                        TaskId = task.Id,
                        SeqNo = s.SeqNo,
                        DestinationId = s.DestinationId,
                        PatientId = s.PatientId,
                        CustomName = finalName,
                        Status = "pending",
                        CreatedAt = DateTimeHelper.Now(),
                        UpdatedAt = DateTimeHelper.Now()
                    };

                    stop = await _repo.CreateStopAsync(stop);

                    // Lưu stopId đầu tiên
                    if (firstStopId == null)
                    {
                        firstStopId = stop.Id;
                    }

                    await _repo.CreateAssignmentAsync(new CompartmentAssignment
                    {
                        TaskId = task.Id,
                        StopId = stop.Id,
                        CompartmentId = s.CompartmentId,
                        CategoryId = s.CategoryId, // Lưu CategoryId để giữ lại khi task bị cancel
                        ItemDesc = finalItemDesc,
                        Status = "pending",
                        CreatedAt = DateTimeHelper.Now(),
                        UpdatedAt = DateTimeHelper.Now()
                    });

                    // Log stop creation
                    await _logRepository.CreateAsync(new Log
                    {
                        RobotId = task.RobotId,
                        TaskId = task.Id,
                        StopId = stop.Id,
                        LogType = "info",
                        Message = $"Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) đã được tạo cho nhiệm vụ #{task.Id}. Bệnh nhân: {patient.FullName} ({patient.PatientCode})",
                        CreatedAt = DateTimeHelper.Now()
                    });
                }

                task.Status = "pending";
                await _repo.UpdateAsync(task.Id, task);

                await transaction.CommitAsync();
                await RecordTaskHistory(task);

                var result = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(result!);

                // Log task creation - không cần stopId vì đây là log tổng quát về task
                await _logRepository.CreateAsync(new Log
                {
                    RobotId = task.RobotId,
                    TaskId = task.Id,
                    StopId = null, // Log tổng quát về task, không cần stopId
                    LogType = "info",
                    Message = $"Nhiệm vụ #{task.Id} đã được tạo thành công. Robot: {robot.Name ?? robot.Code}, Ưu tiên: {task.Priority}, Số điểm dừng: {dto.Stops.Count}",
                    CreatedAt = DateTimeHelper.Now()
                });

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
            // Sử dụng GetByIdForEditAsync để tối ưu performance (không load prescription data)
            var task = await _repo.GetByIdForEditAsync(id);
            if (task == null) return null;

            // ❗ Không cho phép edit task đã completed hoặc canceled
            string taskStatus = task.Status.ToLower();
            if (!AllowedStatusForEdit.Contains(taskStatus))
            {
                throw new InvalidOperationException(
                    $"Không thể chỉnh sửa nhiệm vụ ở trạng thái '{task.Status}'. Chỉ có thể chỉnh sửa khi trạng thái là 'pending'."
                );
            }

            // GetByIdAsync đã include Compartments với Category, không cần query lại (tránh N+1 query)
            // Chỉ cần đảm bảo CategoryId được set nếu có Category object
            // Batch update CategoryId nếu cần (tránh query nhiều lần)
            var compartmentsToUpdate = new List<(ulong CompartmentId, ulong CategoryId)>();
            
            if (task.TaskStops != null)
            {
                foreach (var stop in task.TaskStops)
                {
                    foreach (var assign in stop.CompartmentAssignments)
                    {
                        // Compartment đã được include từ GetByIdAsync (với Category), không cần query lại
                        var comp = assign.Compartment;
                        if (comp != null && !comp.CategoryId.HasValue && comp.Category != null && comp.Category.Id > 0)
                        {
                            // Đảm bảo CategoryId được set nếu có Category object
                            comp.CategoryId = comp.Category.Id;
                            // Lưu lại để update batch sau (tránh query nhiều lần)
                            compartmentsToUpdate.Add((comp.Id, comp.Category.Id));
                        }
                    }
                }
            }

            // Batch update CategoryId nếu cần (chỉ update một lần thay vì từng cái)
            foreach (var (compartmentId, categoryId) in compartmentsToUpdate)
            {
                await _repoRobotCom.AssignCategoryToCompartment(compartmentId, categoryId);
            }

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
                // Đảm bảo TaskStops được load để có thể update status
                var task = await _repo.GetTaskWithStopsAsync(id)
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

                    if (newRobot.RobotCompartments == null || newRobot.RobotCompartments.Count == 0)
                    {
                        throw new InvalidOperationException(
                            $"Robot '{newRobot.Name}' không có khoang chứa, không thể nhận nhiệm vụ.");
                    }

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
                    task.Priority = dto.Priority.Value.ToString();

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
                    task.UpdatedAt = DateTimeHelper.Now();
                    taskStatusManuallyChanged = true;

                    string stopStatus = MapTaskStatusToTaskStopStatus(newStatus);

                    // Update stop status tương ứng với task status
                    if (task.TaskStops != null)
                    {
                        foreach (var stop in task.TaskStops)
                        {
                            // FIX: Không ghi đè delivered
                            var oldStopStatus = stop.Status;
                            if (!string.Equals(stop.Status, "delivered", StringComparison.OrdinalIgnoreCase))
                            {
                                stop.Status = stopStatus;
                            }

                            stop.UpdatedAt = DateTimeHelper.Now();

                            // Map stop status sang CompartmentAssignment status hợp lệ
                            var assignmentStatus = MapStopStatusToAssignmentStatus(stop.Status);
                            
                            if (stop.CompartmentAssignments != null)
                            {
                                foreach (var assign in stop.CompartmentAssignments)
                                {
                                    assign.Status = assignmentStatus;
                                    assign.UpdatedAt = DateTimeHelper.Now();
                                }
                            }

                            // Log stop status change when task status changes
                            if (!string.Equals(oldStopStatus, stopStatus, StringComparison.OrdinalIgnoreCase))
                            {
                                await _logRepository.CreateAsync(new Log
                                {
                                    RobotId = task.RobotId,
                                    TaskId = task.Id,
                                    StopId = stop.Id,
                                    LogType = stopStatus == "delivered" ? "success" : stopStatus == "failed" ? "error" : "info",
                                    Message = $"Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) đã được cập nhật từ '{oldStopStatus}' sang '{stopStatus}' do thay đổi trạng thái nhiệm vụ",
                                    CreatedAt = DateTimeHelper.Now()
                                });
                            }
                        }
                    }

                    // Robot về trạm khi task kết thúc
                    if (newStatus is "completed" or "failed" or "canceled")
                    {
                        await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                        // Log task status change cho tất cả stops
                        var robot = await _repo.GetRobotAsync(task.RobotId);
                        var logType = newStatus == "completed" ? "success" : newStatus == "failed" ? "error" : "warning";
                        var statusText = newStatus == "completed" ? "hoàn thành" : newStatus == "failed" ? "thất bại" : "đã hủy";
                        var taskMessage = $"Nhiệm vụ #{task.Id} đã {statusText}";
                        
                        if (task.TaskStops != null && task.TaskStops.Any())
                        {
                            foreach (var stop in task.TaskStops.OrderBy(s => s.SeqNo))
                            {
                                await _logRepository.CreateAsync(new Log
                                {
                                    RobotId = task.RobotId,
                                    TaskId = task.Id,
                                    StopId = stop.Id,
                                    LogType = logType,
                                    Message = $"{taskMessage}. Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}). Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                                    CreatedAt = DateTimeHelper.Now()
                                });
                            }
                        }
                        else
                        {
                            // Fallback nếu không có stops
                            await _logRepository.CreateAsync(new Log
                            {
                                RobotId = task.RobotId,
                                TaskId = task.Id,
                                LogType = logType,
                                Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                                CreatedAt = DateTimeHelper.Now()
                            });
                        }
                    }
                }

                // ------------------------------
                // 4. UPDATE STOPS
                // ------------------------------
                if (dto.Stops != null)
                {
                    // Lấy danh sách stopId từ dto để xác định stop nào bị xóa
                    var stopIdsInDto = dto.Stops.Where(s => s.StopId > 0).Select(s => s.StopId).ToList();

                    // Xóa các stop không có trong dto (đã bị xóa ở frontend)
                    if (task.TaskStops != null)
                    {
                        var stopsToDelete = task.TaskStops.Where(s => !stopIdsInDto.Contains(s.Id)).ToList();
                        foreach (var stopToDelete in stopsToDelete)
                        {
                            // Release compartments trước khi xóa
                            if (stopToDelete.CompartmentAssignments != null)
                            {
                                foreach (var assign in stopToDelete.CompartmentAssignments)
                                {
                                    await _repoRobotCom.ReleaseCompartmentAsync(assign.CompartmentId);
                                }
                            }
                            // Xóa stop
                            await _repo.DeleteStopAsync(stopToDelete.Id);
                            task.TaskStops.Remove(stopToDelete);
                        }
                    }

                    foreach (var sDto in dto.Stops)
                    {
                        TaskStop stop;
                        bool isNewStop = false;

                        // Nếu stopId = 0 → tạo stop mới
                        if (sDto.StopId == 0)
                        {
                            stop = new TaskStop
                            {
                                TaskId = task.Id,
                                SeqNo = sDto.SeqNo,
                                DestinationId = sDto.DestinationId,
                                PatientId = sDto.PatientId,
                                CustomName = "",
                                Status = "pending",
                                CreatedAt = DateTimeHelper.Now(),
                                UpdatedAt = DateTimeHelper.Now()
                            };

                            stop = await _repo.CreateStopAsync(stop);
                            if (task.TaskStops == null)
                                throw new InvalidOperationException("TaskStops collection is null. Cannot add new stop.");
                            task.TaskStops.Add(stop);
                            isNewStop = true;
                        }
                        else
                        {
                            // Tìm stop hiện có
                            if (task.TaskStops == null)
                                throw new InvalidOperationException($"Không tìm thấy Stop {sDto.StopId} - TaskStops collection is null.");
                            stop = task.TaskStops.FirstOrDefault(x => x.Id == sDto.StopId)
                                ?? throw new InvalidOperationException($"Không tìm thấy Stop {sDto.StopId}");
                        }

                        // Lưu giá trị cũ để so sánh (chỉ khi edit stop cũ, không phải tạo mới)
                        if (!isNewStop)
                        {
                            var oldSeqNo = stop.SeqNo;
                            var oldDestinationId = stop.DestinationId;
                            var oldPatientId = stop.PatientId;
                            var oldCustomName = stop.CustomName;
                            var oldAssignment = stop.CompartmentAssignments.FirstOrDefault();
                            var oldCompartmentId = oldAssignment?.CompartmentId ?? 0;
                            var oldItemDesc = oldAssignment?.ItemDesc ?? "";

                            // Load thông tin cũ để có tên trong log
                            var oldDestination = stop.Destination;
                            var oldPatient = stop.Patient;
                            var oldComp = oldAssignment?.Compartment;

                            // 4.1 Update Stop Status
                            if (!string.IsNullOrWhiteSpace(sDto.Status))
                            {
                                var newStopStatus = sDto.Status.Trim().ToLower();

                                if (!ValidStopStatuses.Contains(newStopStatus))
                                    throw new InvalidOperationException($"Stop status '{newStopStatus}' không hợp lệ.");

                                // FIX: Không cho đổi trạng thái delivered
                                if (stop.Status == "delivered")
                                    continue;

                                var oldStatus = stop.Status;
                                
                                // Chỉ log và update nếu status thực sự thay đổi
                                if (!string.Equals(oldStatus, newStopStatus, StringComparison.OrdinalIgnoreCase))
                                {
                                    stop.Status = newStopStatus;
                                    stop.UpdatedAt = DateTimeHelper.Now();

                                    // Map stop status sang CompartmentAssignment status hợp lệ
                                    // CompartmentAssignment chỉ chấp nhận: pending, loaded, unlocked, delivered, locked, canceled
                                    var assignmentStatus = MapStopStatusToAssignmentStatus(newStopStatus);
                                    
                                    if (stop.CompartmentAssignments != null)
                                    {
                                        foreach (var assign in stop.CompartmentAssignments)
                                        {
                                            assign.Status = assignmentStatus;
                                            assign.UpdatedAt = DateTimeHelper.Now();
                                        }
                                    }

                                    // Log stop status change - chỉ khi có thay đổi
                                    await _logRepository.CreateAsync(new Log
                                    {
                                        RobotId = task.RobotId,
                                        TaskId = task.Id,
                                        StopId = stop.Id,
                                        LogType = newStopStatus == "delivered" ? "success" : newStopStatus == "failed" ? "error" : "info",
                                        Message = $"Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) đã được cập nhật trạng thái từ '{oldStatus}' sang '{newStopStatus}'",
                                        CreatedAt = DateTimeHelper.Now()
                                    });
                                }
                            }

                            // 4.2 Update stop info - Log từng thay đổi riêng biệt
                            var changes = new List<string>();

                            // Check SeqNo change
                            if (oldSeqNo != sDto.SeqNo)
                            {
                                changes.Add($"Thứ tự: {oldSeqNo} → {sDto.SeqNo}");
                                stop.SeqNo = sDto.SeqNo;
                            }

                            // Check DestinationId change
                            if (oldDestinationId != sDto.DestinationId)
                            {
                                var oldDestName = oldDestination?.Name ?? $"ID {oldDestinationId}";
                                // Load destination mới để lấy tên (nếu cần)
                                // Tạm thời dùng ID, có thể cải thiện sau bằng cách inject IDestinationRepository
                                var newDestName = $"ID {sDto.DestinationId}";
                                changes.Add($"Điểm dừng: {oldDestName} → {newDestName}");
                                stop.DestinationId = sDto.DestinationId;
                            }

                            // Check PatientId change
                            if (oldPatientId != sDto.PatientId)
                            {
                                var oldPatName = oldPatient != null ? $"{oldPatient.FullName} ({oldPatient.PatientCode})" : $"ID {oldPatientId}";
                                var newPatient = await _repoPatient.GetByIdAsync(sDto.PatientId);
                                var newPatName = newPatient != null ? $"{newPatient.FullName} ({newPatient.PatientCode})" : $"ID {sDto.PatientId}";
                                changes.Add($"Bệnh nhân: {oldPatName} → {newPatName}");
                                stop.PatientId = sDto.PatientId;
                            }

                            // Check CompartmentId change
                            if (oldCompartmentId != sDto.CompartmentId)
                            {
                                var oldCompCode = oldComp?.CompartmentCode ?? $"ID {oldCompartmentId}";
                                var newComp = await _repo.GetCompartmentAsync(sDto.CompartmentId);
                                var newCompCode = newComp?.CompartmentCode ?? $"ID {sDto.CompartmentId}";
                                changes.Add($"Ngăn chứa: {oldCompCode} → {newCompCode}");
                            }

                            // Check CustomName change
                            var newCustomName = !string.IsNullOrWhiteSpace(sDto.CustomName) ? sDto.CustomName.Trim() : null;
                            if (oldCustomName != newCustomName)
                            {
                                var oldNameDisplay = string.IsNullOrWhiteSpace(oldCustomName) ? "(trống)" : oldCustomName;
                                var newNameDisplay = string.IsNullOrWhiteSpace(newCustomName) ? "(trống)" : newCustomName;
                                changes.Add($"Tên tùy chỉnh: {oldNameDisplay} → {newNameDisplay}");
                            }

                            // Check ItemDesc change
                            var newItemDesc = !string.IsNullOrWhiteSpace(sDto.ItemDesc) ? sDto.ItemDesc.Trim() : "";
                            if (oldItemDesc != newItemDesc)
                            {
                                var oldDescDisplay = string.IsNullOrWhiteSpace(oldItemDesc) ? "(trống)" : oldItemDesc;
                                var newDescDisplay = string.IsNullOrWhiteSpace(newItemDesc) ? "(trống)" : newItemDesc;
                                changes.Add($"Mô tả vật phẩm: {oldDescDisplay} → {newDescDisplay}");
                            }

                            // Log tất cả thay đổi (trừ status - đã log riêng ở trên)
                            if (changes.Any())
                            {
                                var changeMessage = string.Join(", ", changes);
                                await _logRepository.CreateAsync(new Log
                                {
                                    RobotId = task.RobotId,
                                    TaskId = task.Id,
                                    StopId = stop.Id,
                                    LogType = "info",
                                    Message = $"Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) đã được cập nhật: {changeMessage}",
                                    CreatedAt = DateTimeHelper.Now()
                                });
                            }
                        }

                        // Update các trường (nếu là stop mới hoặc đã có thay đổi ở trên)
                        if (isNewStop)
                        {
                            stop.SeqNo = sDto.SeqNo;
                            stop.DestinationId = sDto.DestinationId;
                            stop.PatientId = sDto.PatientId;
                        }
                        else
                        {
                            // Chỉ update nếu chưa update ở trên
                            if (stop.SeqNo != sDto.SeqNo) stop.SeqNo = sDto.SeqNo;
                            if (stop.DestinationId != sDto.DestinationId) stop.DestinationId = sDto.DestinationId;
                            if (stop.PatientId != sDto.PatientId) stop.PatientId = sDto.PatientId;
                        }
                        stop.UpdatedAt = DateTimeHelper.Now();

                        var assignment = stop.CompartmentAssignments?.FirstOrDefault();

                        // Lấy compartment để kiểm tra category
                        var comp = await _repo.GetCompartmentAsync(sDto.CompartmentId)
                            ?? throw new InvalidOperationException("Khoang không tồn tại.");

                        bool changingCompartment =
                            assignment == null || assignment.CompartmentId != sDto.CompartmentId;

                        if (changingCompartment)
                        {
                            if (assignment != null)
                                await _repoRobotCom.ReleaseCompartmentAsync(assignment.CompartmentId);

                            // Kiểm tra compartment status trước (đặc biệt quan trọng khi reactivate task đã cancel)
                            if (comp.Status == "locked")
                                throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang bị khóa. Khoang phải trống để sử dụng lại task.");

                            // Kiểm tra compartment có đang được sử dụng bởi task khác không
                            if (await _repo.IsCompartmentBusyAsync(sDto.CompartmentId))
                                throw new InvalidOperationException(
                                    $"Khoang {comp.CompartmentCode ?? sDto.CompartmentId.ToString()} đang được sử dụng bởi một nhiệm vụ khác. " +
                                    "Vui lòng chọn ngăn chứa khác hoặc đợi nhiệm vụ hiện tại hoàn thành."
                                );

                            if (comp.CategoryId != null && comp.CategoryId != sDto.CategoryId)
                                throw new InvalidOperationException(
                                    $"Khoang {comp.CompartmentCode} chỉ hỗ trợ Category {comp.CategoryId}."
                                );

                            if (comp.CategoryId == null)
                                await _repoRobotCom.AssignCategoryToCompartment(comp.Id, sDto.CategoryId);

                            if (comp.PatientId != null && comp.PatientId != sDto.PatientId)
                                throw new InvalidOperationException(
                                    $"Khoang {comp.CompartmentCode} đang gắn bệnh nhân khác."
                                );

                            if (comp.PatientId == null)
                                await _repoRobotCom.AssignPatientToCompartment(comp.Id, sDto.PatientId);

                            if (assignment == null)
                            {
                                assignment = new CompartmentAssignment
                                {
                                    TaskId = task.Id,
                                    StopId = stop.Id,
                                    CompartmentId = sDto.CompartmentId,
                                    CategoryId = sDto.CategoryId, // Lưu CategoryId để giữ lại khi task bị cancel
                                    Status = stop.Status,
                                    CreatedAt = DateTimeHelper.Now(),
                                    UpdatedAt = DateTimeHelper.Now()
                                };

                                await _repo.CreateAssignmentAsync(assignment);
                                if (stop.CompartmentAssignments == null)
                                    throw new InvalidOperationException("CompartmentAssignments collection is null. Cannot add assignment.");
                                stop.CompartmentAssignments.Add(assignment);
                            }
                            else
                            {
                                assignment.CompartmentId = sDto.CompartmentId;
                                assignment.CategoryId = sDto.CategoryId; // Cập nhật CategoryId khi edit
                                assignment.UpdatedAt = DateTimeHelper.Now();
                            }
                        }

                        // Lấy thông tin bệnh nhân và category để tạo autoName
                        var patient = await _repoPatient.GetByIdAsync(sDto.PatientId)
                            ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân.");

                        // CustomName: Nếu user nhập → dùng giá trị user nhập, nếu không → Tên bệnh nhân + mã bệnh nhân + loại ngăn chứa
                        if (!string.IsNullOrWhiteSpace(sDto.CustomName))
                            stop.CustomName = sDto.CustomName.Trim();
                        else
                        {
                            var categoryName = comp.Category?.Name ?? "N/A";
                            stop.CustomName = $"{patient.FullName} - {patient.PatientCode} - {categoryName}";
                        }

                        // ItemDesc: Nếu user nhập → dùng giá trị user nhập, nếu không → empty string
                        if (assignment != null)
                        {
                            assignment.ItemDesc = !string.IsNullOrWhiteSpace(sDto.ItemDesc)
                                ? sDto.ItemDesc.Trim()
                                : "";
                            assignment.UpdatedAt = DateTimeHelper.Now();
                        }
                    }
                }

                // ==================================================================
                // 5. AUTO-COMPLETE IF ALL STOPS DELIVERED
                // ==================================================================
                bool allDelivered = task.TaskStops != null && 
                    task.TaskStops.Any() &&
                    task.TaskStops.All(s =>
                        string.Equals(s.Status, "delivered", StringComparison.OrdinalIgnoreCase));

                if (!taskStatusManuallyChanged && allDelivered)
                {
                    task.Status = "completed";
                    task.UpdatedAt = DateTimeHelper.Now();

                    await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                    // Log task auto-completed cho tất cả stops
                    var robot = await _repo.GetRobotAsync(task.RobotId);
                    var taskMessage = $"Nhiệm vụ #{task.Id} đã tự động hoàn thành (tất cả điểm dừng đã giao)";
                    
                    if (task.TaskStops != null && task.TaskStops.Any())
                    {
                        foreach (var stop in task.TaskStops.OrderBy(s => s.SeqNo))
                        {
                            await _logRepository.CreateAsync(new Log
                            {
                                RobotId = task.RobotId,
                                TaskId = task.Id,
                                StopId = stop.Id,
                                LogType = "success",
                                Message = $"{taskMessage}. Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}). Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                                CreatedAt = DateTimeHelper.Now()
                            });
                        }
                    }
                    else
                    {
                        // Fallback nếu không có stops
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            LogType = "success",
                            Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }
                }

                // ==================================================================
                // 6. AUTO-CANCEL IF ALL STOPS SKIPPED
                // ==================================================================
                bool allSkipped = task.TaskStops != null && 
                    task.TaskStops.Any() &&
                    task.TaskStops.All(s =>
                        string.Equals(s.Status, "skipped", StringComparison.OrdinalIgnoreCase));

                if (!taskStatusManuallyChanged && allSkipped)
                {
                    task.Status = "canceled";
                    task.UpdatedAt = DateTimeHelper.Now();

                    await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                    // Log task auto-canceled cho tất cả stops
                    var robot = await _repo.GetRobotAsync(task.RobotId);
                    var taskMessage = $"Nhiệm vụ #{task.Id} đã tự động hủy bỏ (tất cả điểm dừng đều bị bỏ qua)";
                    
                    if (task.TaskStops != null && task.TaskStops.Any())
                    {
                        foreach (var stop in task.TaskStops.OrderBy(s => s.SeqNo))
                        {
                            await _logRepository.CreateAsync(new Log
                            {
                                RobotId = task.RobotId,
                                TaskId = task.Id,
                                StopId = stop.Id,
                                LogType = "warning",
                                Message = $"{taskMessage}. Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}). Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                                CreatedAt = DateTimeHelper.Now()
                            });
                        }
                    }
                    else
                    {
                        // Fallback nếu không có stops
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            LogType = "warning",
                            Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }
                }

                // ==================================================================
                // 7. AUTO-FAIL IF ALL STOPS FAILED
                // ==================================================================
                bool allFailed = task.TaskStops != null && 
                    task.TaskStops.Any() &&
                    task.TaskStops.All(s =>
                        string.Equals(s.Status, "failed", StringComparison.OrdinalIgnoreCase));

                if (!taskStatusManuallyChanged && allFailed)
                {
                    task.Status = "failed";
                    task.UpdatedAt = DateTimeHelper.Now();

                    await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                    // Log task auto-failed cho tất cả stops
                    var robot = await _repo.GetRobotAsync(task.RobotId);
                    var taskMessage = $"Nhiệm vụ #{task.Id} đã tự động thất bại (tất cả điểm dừng đều thất bại)";
                    
                    if (task.TaskStops != null && task.TaskStops.Any())
                    {
                        foreach (var stop in task.TaskStops.OrderBy(s => s.SeqNo))
                        {
                            await _logRepository.CreateAsync(new Log
                            {
                                RobotId = task.RobotId,
                                TaskId = task.Id,
                                StopId = stop.Id,
                                LogType = "error",
                                Message = $"{taskMessage}. Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}). Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                                CreatedAt = DateTimeHelper.Now()
                            });
                        }
                    }
                    else
                    {
                        // Fallback nếu không có stops
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            LogType = "error",
                            Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }
                }

                // ==================================================================
                // 8. RELEASE COMPARTMENTS WHEN TASK FINISHES
                // ==================================================================
                if (task.Status == "completed" ||
                    task.Status == "failed" ||
                    task.Status == "canceled")
                {
                    if (task.TaskStops != null)
                    {
                        foreach (var stop in task.TaskStops)
                        {
                            if (stop.CompartmentAssignments != null)
                            {
                                foreach (var assign in stop.CompartmentAssignments)
                                {
                                    await _repoRobotCom.ReleaseCompartmentAsync(assign.CompartmentId);
                                }
                            }
                        }
                    }
                }

                // Save, commit
                await _repo.SaveChangesAsync();

                await transaction.CommitAsync();
                await RecordTaskHistory(task);
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
                StartedAt = task.StartedAt,
                CompletedAt = task.CompletedAt,
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

                        CustomName = s.CustomName,
                        ItemDesc = assign?.ItemDesc ?? "",
                        StopStatus = s.Status,
                        AssignmentStatus = s.Status,

                        Prescription = rx == null ? null : new PrescriptionFullDto
                        {
                            PrescriptionCode = rx.PrescriptionCode,
                            CreatedAt = rx.CreatedAt ?? DateTime.MinValue,
                            Status = rx.Status ?? "",

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

                    // Lấy CategoryId và CompartmentId từ assignment
                    ulong categoryId = 0;
                    ulong compartmentId = 0;

                    if (assign != null)
                    {
                        compartmentId = assign.CompartmentId;

                        // Ưu tiên lấy CategoryId từ CompartmentAssignment (giữ lại khi task bị cancel)
                        if (assign.CategoryId.HasValue && assign.CategoryId.Value > 0)
                        {
                            categoryId = assign.CategoryId.Value;
                        }
                        // Nếu CompartmentAssignment không có CategoryId, lấy từ Compartment
                        else if (assign.Compartment != null)
                        {
                            // Compartment đã được include với Category trong GetByIdAsync
                            // CategoryId là ulong? (nullable)
                            if (assign.Compartment.CategoryId.HasValue && assign.Compartment.CategoryId.Value > 0)
                            {
                                categoryId = assign.Compartment.CategoryId.Value;
                            }
                            else if (assign.Compartment.Category != null && assign.Compartment.Category.Id > 0)
                            {
                                // Nếu CategoryId null nhưng Category object có → lấy từ Category.Id
                                categoryId = assign.Compartment.Category.Id;
                            }
                            // Nếu cả CategoryId và Category đều null → để categoryId = 0
                            // (có thể Compartment chưa được gán category)
                        }
                        else if (compartmentId > 0)
                        {
                            // Nếu Compartment chưa được load (đã được load trong GetEditDataAsync nhưng vẫn null)
                            // → Có thể Compartment đã bị xóa, để categoryId = 0
                            categoryId = 0;
                        }
                    }

                    return new TaskEditStopDto
                    {
                        StopId = s.Id,
                        SeqNo = s.SeqNo,
                        DestinationId = s.DestinationId ?? 0,
                        PatientId = s.PatientId ?? 0,
                        CategoryId = categoryId,
                        CompartmentId = compartmentId,
                        CompartmentCode = assign?.Compartment?.CompartmentCode, // Thêm CompartmentCode từ Compartment
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
            "pending"
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

        /// <summary>
        /// Map TaskStop status sang CompartmentAssignment status hợp lệ
        /// CompartmentAssignment chỉ có: pending, loaded, unlocked, delivered, locked, canceled
        /// TaskStop có: pending, in_progress, awaiting_handover, delivered, skipped, failed
        /// </summary>
        private string MapStopStatusToAssignmentStatus(string stopStatus)
        {
            return stopStatus.ToLower() switch
            {
                "pending" => "pending",
                "in_progress" => "loaded",      // Khi đang giao = đã load vào compartment
                "awaiting_handover" => "unlocked", // Chờ bàn giao = đã unlock compartment
                "delivered" => "delivered",
                "skipped" => "canceled",         // Bỏ qua = canceled
                "failed" => "canceled",         // Thất bại = canceled
                _ => "pending"
            };
        }

        // Helper method: Kiểm tra Category có liên quan đến thuốc không
        // Dựa vào tên category (kiểm tra các từ khóa liên quan đến thuốc)
        private bool IsMedicineRelatedCategory(CompartmentCategory? category)
        {
            if (category == null || string.IsNullOrWhiteSpace(category.Name))
                return false;

            var categoryName = category.Name.ToLower().Trim();

            // Kiểm tra các từ khóa liên quan đến thuốc (mở rộng danh sách)
            var medicineKeywords = new[] {
                "thuốc",
                "medicine",
                "drug",
                "medication",
                "dược phẩm",
                "pharmaceutical",
                "dược",
                "med",
                "rx",
                "prescription"
            };

            return medicineKeywords.Any(keyword => categoryName.Contains(keyword));
        }

        public async Task<RunTaskInfoDto?> GetRunInfoAsync(ulong taskId)
        {
            var task = await _repo.GetTaskWithStopsAsync(taskId);
            if (task == null) return null;

            var stops = task.TaskStops.OrderBy(s => s.SeqNo).Select(s => new RunTaskStopDto
            {
                StopId = s.Id,
                Order = s.SeqNo,
                DestinationId = s.DestinationId ?? 0,
                Name = s.Destination?.Name ?? "",
                X = s.Destination?.X ?? 0,
                Y = s.Destination?.Y ?? 0,
                AssignmentStatus = s.Status
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
            if (task == null)
                throw new Exception("Task not found");

            var stop = task.TaskStops.FirstOrDefault(s => s.Id == stopId);
            if (stop == null)
                throw new Exception("Stop not found");
            // ❗ FIX: KHÓA DELIVERED
            if (stop.Status == "delivered")
                throw new Exception("Stop has been delivered — cannot update again.");
            // Update stop status
            stop.Status = newStatus;
            stop.UpdatedAt = DateTimeHelper.Now();

            // Log stop status update
            await _logRepository.CreateAsync(new Log
            {
                RobotId = task.RobotId,
                TaskId = task.Id,
                StopId = stop.Id,
                LogType = newStatus == "delivered" ? "success" : newStatus == "failed" ? "error" : "info",
                Message = $"Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) đã được cập nhật trạng thái thành: {newStatus}",
                CreatedAt = DateTimeHelper.Now()
            });

            // ============================================================
            // AUTO COMPLETE TASK NẾU TẤT CẢ STOP = delivered
            // ============================================================
            bool allDelivered = task.TaskStops.Any() &&
                task.TaskStops.All(s => string.Equals(s.Status, "delivered", StringComparison.OrdinalIgnoreCase));

            if (allDelivered)
            {
                task.Status = "completed";
                task.UpdatedAt = DateTimeHelper.Now();

                await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                // Giải phóng khoang
                foreach (var s in task.TaskStops)
                {
                    foreach (var a in s.CompartmentAssignments)
                    {
                        await _repoRobotCom.ReleaseCompartmentAsync(a.CompartmentId);
                    }
                }

                // Log task auto-completed from stop status update cho tất cả stops
                var robot = await _repo.GetRobotAsync(task.RobotId);
                var taskMessage = $"Nhiệm vụ #{task.Id} đã tự động hoàn thành (tất cả điểm dừng đã giao)";
                
                if (task.TaskStops != null && task.TaskStops.Any())
                {
                    foreach (var stopItem in task.TaskStops.OrderBy(s => s.SeqNo))
                    {
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            StopId = stopItem.Id,
                            LogType = "success",
                            Message = $"{taskMessage}. Điểm dừng #{stopItem.SeqNo} (Stop ID: {stopItem.Id}). Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }
                }
                else
                {
                    // Fallback nếu không có stops
                    await _logRepository.CreateAsync(new Log
                    {
                        RobotId = task.RobotId,
                        TaskId = task.Id,
                        LogType = "success",
                        Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                        CreatedAt = DateTimeHelper.Now()
                    });
                }
            }

            // Lưu DB
            await _repo.SaveChangesAsync();

            await RecordTaskHistory(task);

            return true;
        }



        public async Task<StopUpdateResultDto> CompleteTaskAsync(ulong taskId)
        {
            var task = await _repo.GetByIdAsync(taskId);
            if (task == null)
                return new StopUpdateResultDto { Success = false, Message = "Task không tồn tại." };

            // ❗ KHÔNG force tất cả stops thành delivered - giữ nguyên status của từng stop
            // Chỉ update CompartmentAssignment status cho các stops đã delivered
            int deliveredCount = 0;
            foreach (var stop in task.TaskStops)
            {
                // Chỉ update CompartmentAssignment status nếu stop đã delivered
                if (string.Equals(stop.Status, "delivered", StringComparison.OrdinalIgnoreCase))
                {
                    deliveredCount++;
                    foreach (var assign in stop.CompartmentAssignments)
                    {
                        // Map stop status sang assignment status hợp lệ
                        var assignmentStatus = MapStopStatusToAssignmentStatus(stop.Status);
                        assign.Status = assignmentStatus;
                        assign.UpdatedAt = DateTimeHelper.Now();
                    }
                }
                else
                {
                    // Với stops chưa delivered (skipped, failed, pending, etc.)
                    // Vẫn update CompartmentAssignment status để phản ánh đúng trạng thái
                    foreach (var assign in stop.CompartmentAssignments)
                    {
                        var assignmentStatus = MapStopStatusToAssignmentStatus(stop.Status);
                        assign.Status = assignmentStatus;
                        assign.UpdatedAt = DateTimeHelper.Now();
                    }
                }
            }

            // Task status = completed (nhưng giữ nguyên stop status)
            task.Status = "completed";
            task.UpdatedAt = DateTimeHelper.Now();
            task.CompletedAt = DateTimeHelper.Now();

            await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

            // Release all compartments
            foreach (var stop in task.TaskStops)
            {
                foreach (var a in stop.CompartmentAssignments)
                    await _repoRobotCom.ReleaseCompartmentAsync(a.CompartmentId);
            }

            await _repo.SaveChangesAsync();
            await RecordTaskHistory(task);

            // Log task completed với thông tin số stops đã delivered
            var robot = await _repo.GetRobotAsync(task.RobotId);
            var totalStops = task.TaskStops?.Count ?? 0;
            var taskMessage = $"Nhiệm vụ #{task.Id} đã hoàn thành. Đã giao: {deliveredCount}/{totalStops} điểm dừng";
            
            await _logRepository.CreateAsync(new Log
            {
                RobotId = task.RobotId,
                TaskId = task.Id,
                LogType = "success",
                Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                CreatedAt = DateTimeHelper.Now()
            });

            // Gửi SignalR event để cập nhật real-time cho frontend
            var updatedTask = await _repo.GetByIdAsync(task.Id);
            var response = MapToResponse(updatedTask!);
            await _taskHub.Clients.All.SendAsync("TaskUpdated", response);

            return new StopUpdateResultDto
            {
                Success = true,
                Task = MapToDetail(task)
            };
        }

        private async System.Threading.Tasks.Task RecordTaskHistory(Models.Entities.Task task, double? startedEarlyMinutes = null, string? cancelNote = null)
        {
            var fullTask = await _repo.GetByIdAsync(task.Id);

            // Lấy history gần nhất
            var lastHistory = await _taskHistoryService.GetLastHistoryAsync(task.Id);

            string? note = null;

            // Ưu tiên ghi chú hủy nếu có
            if (!string.IsNullOrEmpty(cancelNote))
            {
                note = cancelNote;
            }
            // Nếu không thì ghi chú chạy sớm
            else if (startedEarlyMinutes.HasValue && startedEarlyMinutes > 0)
            {
                note = BuildEarlyStartNote(startedEarlyMinutes);
            }

            // Nếu chưa có history → luôn lưu
            if (lastHistory == null)
            {
                await _taskHistoryService.CreateHistoryFromTaskAsync(fullTask!, note);
                return;
            }

            // Kiểm tra thay đổi quan trọng như cũ
            bool hasImportantChange =
                lastHistory.FinalStatus != fullTask!.Status ||
                lastHistory.Priority != fullTask.Priority ||
                lastHistory.MapId != fullTask.MapId ||
                lastHistory.RobotId != fullTask.RobotId ||
                lastHistory.DeliveredStops != fullTask.TaskStops.Count(s => s.Status == "delivered") ||
                lastHistory.FailedStops != fullTask.TaskStops.Count(s => s.Status == "failed") ||
                lastHistory.SkippedStops != fullTask.TaskStops.Count(s => s.Status == "skipped");

            if (hasImportantChange || note != null)
            {
                await _taskHistoryService.CreateHistoryFromTaskAsync(fullTask!, note);
            }
        }

        // Helper: Lấy stopId đầu tiên của task
        private async Task<ulong?> GetFirstStopIdAsync(ulong taskId, Models.Entities.Task? task = null)
        {
            // Nếu task đã được load và có TaskStops, lấy từ đó
            if (task != null && task.TaskStops != null && task.TaskStops.Any())
            {
                return task.TaskStops.OrderBy(s => s.SeqNo).FirstOrDefault()?.Id;
            }

            // Nếu không, query trực tiếp từ database
            var firstStop = await _repo.GetTaskWithStopsAsync(taskId);
            return firstStop?.TaskStops?.OrderBy(s => s.SeqNo).FirstOrDefault()?.Id;
        }

        // Helper: tạo ghi chú tiếng Việt 
        private string? BuildEarlyStartNote(double? startedEarlyMinutes)
        {
            if (!startedEarlyMinutes.HasValue || startedEarlyMinutes <= 0) return null;

            var minutes = Math.Floor(startedEarlyMinutes.Value);
            var seconds = Math.Round((startedEarlyMinutes.Value - minutes) * 60);

            if (minutes >= 1)
                return $"Khởi động sớm {minutes:F0} phút {seconds:F0} giây trước giờ dự kiến";

            return $"Khởi động sớm {seconds:F0} giây trước giờ dự kiến";
        }
        public async Task<TaskResponseDto?> StartTaskAsync(ulong taskId)
        {
            using var transaction = await _repo.BeginTransactionAsync();
            try
            {
                var task = await _repo.GetByIdAsync(taskId)
                    ?? throw new InvalidOperationException("Không tìm thấy nhiệm vụ.");

                if (task.Status != "pending")
                    throw new InvalidOperationException($"Chỉ có thể bắt đầu task ở trạng thái pending. Hiện tại: {task.Status}");

                var robot = await _repo.GetRobotAsync(task.RobotId)
                    ?? throw new InvalidOperationException("Robot không tồn tại.");

                if (robot.Status != "at_station")
                    throw new InvalidOperationException($"Robot đang bận ({robot.Status}), không thể bắt đầu task.");

                // TÍNH TOÁN: Có chạy sớm không?
                double? startedEarlyMinutes = null;
                if (task.ScheduledStartAt.HasValue && task.ScheduledStartAt.Value > DateTimeHelper.Now())
                {
                    startedEarlyMinutes = Math.Round((task.ScheduledStartAt.Value - DateTimeHelper.Now()).TotalMinutes, 1);
                }

                // === CHUYỂN TRẠNG THÁI ===
                task.Status = "in_progress";
                task.StartedAt = DateTimeHelper.Now();
                task.UpdatedAt = DateTimeHelper.Now();

                robot.Status = "transporting";
                await _repo.UpdateRobotStatusAsync(robot.Id, "transporting");

                await _repo.SaveChangesAsync();
                await transaction.CommitAsync();

                // GHI LỊCH SỬ CÓ GHI CHÚ CHẠY SỚM
                var fullTask = await _repo.GetByIdAsync(task.Id);
                await RecordTaskHistory(fullTask!, startedEarlyMinutes);

                // Log task started cho tất cả stops
                var logMessagePrefix = startedEarlyMinutes.HasValue && startedEarlyMinutes > 0
                    ? $"Nhiệm vụ #{task.Id} đã được bắt đầu sớm {startedEarlyMinutes:F1} phút"
                    : $"Nhiệm vụ #{task.Id} đã được bắt đầu";
                
                if (fullTask?.TaskStops != null && fullTask.TaskStops.Any())
                {
                    foreach (var stop in fullTask.TaskStops.OrderBy(s => s.SeqNo))
                    {
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            StopId = stop.Id,
                            LogType = "info",
                            Message = $"{logMessagePrefix}. Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) sẵn sàng. Robot: {robot.Name ?? robot.Code}",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }
                }
                else
                {
                    // Fallback nếu không có stops
                    await _logRepository.CreateAsync(new Log
                    {
                        RobotId = task.RobotId,
                        TaskId = task.Id,
                        LogType = "info",
                        Message = $"{logMessagePrefix}. Robot: {robot.Name ?? robot.Code}",
                        CreatedAt = DateTimeHelper.Now()
                    });
                }

                var updatedTask = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(updatedTask!);

                await _taskHub.Clients.All.SendAsync("TaskStarted", response);

                return response;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException($"Không thể bắt đầu nhiệm vụ: {ex.Message}");
            }
        }

        public async System.Threading.Tasks.Task CancelOverduePendingTasksAsync()
        {
            // Thời gian cho phép trễ (phút) - có thể config sau
            const int GracePeriodMinutes = 10;

            using var transaction = await _repo.BeginTransactionAsync();
            try
            {
                var now = DateTimeHelper.Now();
                var overdueTime = now.AddMinutes(-GracePeriodMinutes);

                var overdueTasks = await _repo.GetListAsync(new TaskFilterDto
                {
                    Status = "pending"
                });

                var tasksToCancel = overdueTasks
                    .Where(t => t.ScheduledStartAt.HasValue && t.ScheduledStartAt.Value <= overdueTime)
                    .ToList();

                if (!tasksToCancel.Any()) return;

                foreach (var task in tasksToCancel)
                {
                    // 1. Chuyển task thành canceled
                    task.Status = "canceled";
                    task.UpdatedAt = DateTimeHelper.Now();

                    // 2. Robot về trạm
                    await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                    // 3. Giải phóng tất cả khoang chứa
                    if (task.TaskStops != null)
                    {
                        foreach (var stop in task.TaskStops)
                        {
                            foreach (var assignment in stop.CompartmentAssignments)
                            {
                                await _repoRobotCom.ReleaseCompartmentAsync(assignment.CompartmentId);
                            }
                        }
                    }

                    await _repo.SaveChangesAsync();

                    // TÍNH SỐ PHÚT QUÁ GIỜ
                    var overdueMinutes = task.ScheduledStartAt.HasValue
                        ? Math.Round((DateTimeHelper.Now() - task.ScheduledStartAt.Value).TotalMinutes, 1)
                        : GracePeriodMinutes;

                    // TẠO GHI CHÚ ĐẸP
                    var cancelNote = $"Nhiệm vụ bị hủy tự động do quá giờ khởi hành {overdueMinutes:F1} phút";

                    await RecordTaskHistory(task, cancelNote: cancelNote);

                    // Log task auto-canceled cho tất cả stops
                    var robot = await _repo.GetRobotAsync(task.RobotId);
                    var taskMessage = $"Nhiệm vụ #{task.Id} đã bị hủy tự động do quá giờ khởi hành {overdueMinutes:F1} phút";
                    
                    if (task.TaskStops != null && task.TaskStops.Any())
                    {
                        foreach (var stop in task.TaskStops.OrderBy(s => s.SeqNo))
                        {
                            await _logRepository.CreateAsync(new Log
                            {
                                RobotId = task.RobotId,
                                TaskId = task.Id,
                                StopId = stop.Id,
                                LogType = "warning",
                                Message = $"{taskMessage}. Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) đã bị hủy. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                                CreatedAt = DateTimeHelper.Now()
                            });
                        }
                    }
                    else
                    {
                        // Fallback nếu không có stops
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            LogType = "warning",
                            Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }

                    // 4. Gửi SignalR thông báo
                    var canceledTaskResponse = MapToResponse(task);

                    await _taskHub.Clients.Group("AllTasks").SendAsync("TaskCanceled", new
                    {
                        taskId = task.Id,
                        reason = $"Quá giờ khởi hành hơn {GracePeriodMinutes} phút",
                        canceledAt = DateTimeHelper.Now(),
                        task = canceledTaskResponse
                    });

                    // Gửi riêng cho robot liên quan (nếu cần)
                    if (robot?.Code != null)
                    {
                        await _taskHub.Clients.Group($"Robot_{robot.Code}").SendAsync("TaskCanceled", new
                        {
                            taskId = task.Id,
                            reason = "Quá giờ – nhiệm vụ bị hủy tự động"
                        });
                    }
                }

                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                // Log lỗi (nếu có ILogger)
                Console.WriteLine($"[TaskScheduler] Lỗi hủy task quá hạn: {ex.Message}");
            }
        }

        // ======================================================================
        // CANCEL TASK (Hủy nhiệm vụ thủ công)
        // ======================================================================
        public async Task<TaskResponseDto?> CancelTaskAsync(ulong taskId, string? reason = null)
        {
            using var transaction = await _repo.BeginTransactionAsync();
            try
            {
                var task = await _repo.GetByIdAsync(taskId)
                    ?? throw new InvalidOperationException("Không tìm thấy nhiệm vụ.");

                // Kiểm tra task đã bị hủy hoặc hoàn thành chưa
                if (task.Status == "canceled")
                    throw new InvalidOperationException("Nhiệm vụ đã bị hủy trước đó.");

                if (task.Status == "completed")
                    throw new InvalidOperationException("Không thể hủy nhiệm vụ đã hoàn thành.");

                if (task.Status == "failed")
                    throw new InvalidOperationException("Nhiệm vụ đã thất bại, không cần hủy.");

                // Hủy thủ công chỉ cho phép khi task chưa bắt đầu (pending)
                // Hủy tự động đã được xử lý bởi CancelOverduePendingTasksAsync
                if (task.Status != "pending")
                    throw new InvalidOperationException(
                        $"Không thể hủy thủ công nhiệm vụ đang ở trạng thái '{task.Status}'. " +
                        "Chỉ có thể hủy nhiệm vụ chưa bắt đầu (pending)."
                    );

                // 1. Đổi status task thành "canceled"
                task.Status = "canceled";
                task.UpdatedAt = DateTimeHelper.Now();

                // 2. Đổi status của tất cả stops thành "canceled" hoặc "skipped"
                foreach (var stop in task.TaskStops)
                {
                    var oldStopStatus = stop.Status;
                    // Chỉ đổi status nếu chưa delivered
                    if (stop.Status != "delivered")
                    {
                        stop.Status = "skipped";
                        stop.UpdatedAt = DateTimeHelper.Now();
                    }

                    // Đổi status của tất cả assignments
                    foreach (var assignment in stop.CompartmentAssignments)
                    {
                        if (assignment.Status != "delivered")
                        {
                            assignment.Status = "canceled";
                            assignment.UpdatedAt = DateTimeHelper.Now();
                        }
                    }

                    // Log stop canceled
                    if (oldStopStatus != "delivered" && stop.Status == "skipped")
                    {
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            StopId = stop.Id,
                            LogType = "warning",
                            Message = $"Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}) đã bị hủy do nhiệm vụ bị hủy",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }
                }

                // 3. Đưa robot về trạm (at_station)
                await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                // 4. Giải phóng tất cả khoang chứa (release compartments)
                foreach (var stop in task.TaskStops)
                {
                    foreach (var assignment in stop.CompartmentAssignments)
                    {
                        await _repoRobotCom.ReleaseCompartmentAsync(assignment.CompartmentId);
                    }
                }

                // 5. Lưu vào database (không xóa, chỉ đổi status)
                await _repo.SaveChangesAsync();
                await transaction.CommitAsync();

                // 6. Ghi lịch sử với ghi chú hủy
                var cancelNote = string.IsNullOrWhiteSpace(reason)
                    ? "Nhiệm vụ đã bị hủy"
                    : $"Nhiệm vụ đã bị hủy: {reason}";
                await RecordTaskHistory(task, cancelNote: cancelNote);

                // 7. Log task canceled cho tất cả stops (đã có log riêng cho từng stop ở trên, nhưng thêm log tổng quát cho mỗi stop)
                var robot = await _repo.GetRobotAsync(task.RobotId);
                var cancelReason = string.IsNullOrWhiteSpace(reason) ? "Hủy thủ công" : reason;
                var taskMessage = $"Nhiệm vụ #{task.Id} đã bị hủy. Lý do: {cancelReason}";
                
                // Log tổng quát cho từng stop (ngoài log riêng đã có ở trên)
                if (task.TaskStops != null && task.TaskStops.Any())
                {
                    foreach (var stop in task.TaskStops.OrderBy(s => s.SeqNo))
                    {
                        await _logRepository.CreateAsync(new Log
                        {
                            RobotId = task.RobotId,
                            TaskId = task.Id,
                            StopId = stop.Id,
                            LogType = "warning",
                            Message = $"{taskMessage}. Điểm dừng #{stop.SeqNo} (Stop ID: {stop.Id}). Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                            CreatedAt = DateTimeHelper.Now()
                        });
                    }
                }
                else
                {
                    // Fallback nếu không có stops
                    await _logRepository.CreateAsync(new Log
                    {
                        RobotId = task.RobotId,
                        TaskId = task.Id,
                        LogType = "warning",
                        Message = $"{taskMessage}. Robot: {robot?.Name ?? robot?.Code ?? "N/A"}",
                        CreatedAt = DateTimeHelper.Now()
                    });
                }

                // 8. Lấy task đã cập nhật và trả về
                var updatedTask = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(updatedTask!);

                // 9. Gửi SignalR thông báo
                await _taskHub.Clients.All.SendAsync("TaskCanceled", new
                {
                    taskId = task.Id,
                    reason = reason ?? "Hủy thủ công",
                    canceledAt = DateTimeHelper.Now(),
                    task = response
                });

                return response;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException($"Không thể hủy nhiệm vụ: {ex.Message}");
            }
        }
    }
}


