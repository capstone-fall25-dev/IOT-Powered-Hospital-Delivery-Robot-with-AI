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

        public TaskService(
            ITaskRepository repo,
            IRobotRepository repoRobot,
            IRobotCompartmentRepository repoRobotCom,
            IPatientRepository repoPatient,
            IHubContext<TaskHub> taskHub,
            ITaskHistoryService taskHistoryService)
        {
            _repo = repo;
            _repoRobot = repoRobot;
            _repoRobotCom = repoRobotCom;
            _repoPatient = repoPatient;
            _taskHub = taskHub;
            _taskHistoryService = taskHistoryService;
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
                StartedAt = t.StartedAt,
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

                // Create task
                var task = new Models.Entities.Task
                {
                    MapId = dto.MapId,
                    RobotId = dto.RobotId,
                    AssignedBy = currentUserId,
                    Status = "pending",
                    Priority = dto.Priority.ToString(),
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now,
                    ScheduledStartAt = dto.ScheduledStartAt
                };

                task = await _repo.CreateAsync(task);

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

                    // Kiểm tra loại ngăn chứa có liên quan đến thuốc không
                    bool isMedicineCategory = IsMedicineRelatedCategory(comp.Category);

                    Prescription? rx = null;
                    string autoName = "";
                    string itemDesc = "";

                    if (isMedicineCategory)
                    {
                        // Nếu là loại ngăn chứa thuốc, yêu cầu đơn thuốc được xác nhận
                        if (string.IsNullOrWhiteSpace(s.PrescriptionCode))
                            throw new InvalidOperationException(
                                $"Loại ngăn chứa '{comp.Category?.Name ?? "N/A"}' liên quan đến thuốc. " +
                                "Vui lòng chọn và xác nhận đơn thuốc cho bệnh nhân này."
                            );

                        // Lấy đơn thuốc theo mã code
                        rx = await _repo.GetPrescriptionByCodeAsync(s.PrescriptionCode)
                            ?? throw new InvalidOperationException(
                                $"Không tìm thấy đơn thuốc với mã '{s.PrescriptionCode}'."
                            );

                        // Kiểm tra đơn thuốc thuộc về bệnh nhân này
                        if (rx.PatientId != s.PatientId)
                            throw new InvalidOperationException(
                                $"Đơn thuốc '{s.PrescriptionCode}' không thuộc về bệnh nhân này."
                            );

                        // Kiểm tra đơn thuốc đã được xác nhận (phải là approved)
                        // Frontend đã gọi API approve trước khi tạo task, nên status phải là approved
                        if (rx.Status?.ToLower() != "approved")
                            throw new InvalidOperationException(
                                $"Đơn thuốc '{s.PrescriptionCode}' chưa được xác nhận. " +
                                $"Trạng thái hiện tại: {rx.Status}. Vui lòng xác nhận đơn thuốc trước khi tạo task."
                            );

                        // Tạo autoName và itemDesc từ đơn thuốc (giữ lại để lưu lịch sử)
                        autoName = $"{patient.FullName} - {patient.PatientCode} - {rx.PrescriptionCode}";
                        autoName += " - " + string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));

                        itemDesc = $"RX#{rx.PrescriptionCode}: " +
                            string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));
                    }
                    else
                    {
                        // Nếu không phải thuốc, không cần đơn thuốc
                        autoName = $"{patient.FullName} - {patient.PatientCode}";
                        itemDesc = "Vật phẩm khác";
                    }

                    var finalName = string.IsNullOrWhiteSpace(s.CustomName)
                        ? autoName
                        : s.CustomName.Trim();

                    var finalItemDesc = string.IsNullOrWhiteSpace(s.ItemDesc)
                        ? itemDesc
                        : s.ItemDesc.Trim();

                    var stop = new TaskStop
                    {
                        TaskId = task.Id,
                        SeqNo = s.SeqNo,
                        DestinationId = s.DestinationId,
                        PatientId = s.PatientId,
                        CustomName = finalName,
                        Status = "pending",
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    };

                    stop = await _repo.CreateStopAsync(stop);

                    await _repo.CreateAssignmentAsync(new CompartmentAssignment
                    {
                        TaskId = task.Id,
                        StopId = stop.Id,
                        CompartmentId = s.CompartmentId,
                        ItemDesc = itemDesc,
                        Status = "pending",
                        CreatedAt = DateTime.Now,
                        UpdatedAt = DateTime.Now
                    });
                }

                task.Status = "pending";
                await _repo.UpdateAsync(task.Id, task);

                await transaction.CommitAsync();
                await RecordTaskHistory(task);

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
                    task.UpdatedAt = DateTime.Now;
                    taskStatusManuallyChanged = true;

                    string stopStatus = MapTaskStatusToTaskStopStatus(newStatus);

                    foreach (var stop in task.TaskStops)
                    {
                        // FIX: Không ghi đè delivered
                        if (!string.Equals(stop.Status, "delivered", StringComparison.OrdinalIgnoreCase))
                        {
                            stop.Status = stopStatus;
                        }

                        stop.UpdatedAt = DateTime.Now;

                        foreach (var assign in stop.CompartmentAssignments)
                        {
                            assign.Status = stopStatus;
                            assign.UpdatedAt = DateTime.Now;
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

                            // FIX: Không cho đổi trạng thái delivered
                            if (stop.Status == "delivered")
                                continue;

                            stop.Status = newStopStatus;

                            stop.UpdatedAt = DateTime.Now;

                            foreach (var assign in stop.CompartmentAssignments)
                            {
                                assign.Status = newStopStatus;
                                assign.UpdatedAt = DateTime.Now;
                            }
                        }

                        // 4.2 Update stop info
                        stop.SeqNo = sDto.SeqNo;
                        stop.DestinationId = sDto.DestinationId;
                        stop.PatientId = sDto.PatientId;
                        stop.UpdatedAt = DateTime.Now;

                        var assignment = stop.CompartmentAssignments.FirstOrDefault();

                        // Lấy compartment để kiểm tra category
                        var comp = await _repo.GetCompartmentAsync(sDto.CompartmentId)
                            ?? throw new InvalidOperationException("Khoang không tồn tại.");

                        bool changingCompartment =
                            assignment == null || assignment.CompartmentId != sDto.CompartmentId;

                        if (changingCompartment)
                        {
                            if (assignment != null)
                                await _repoRobotCom.ReleaseCompartmentAsync(assignment.CompartmentId);

                            // Kiểm tra compartment status trước
                            if (comp.Status == "locked")
                                throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang bị khóa.");

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
                                    Status = stop.Status,
                                    CreatedAt = DateTime.Now,
                                    UpdatedAt = DateTime.Now
                                };

                                await _repo.CreateAssignmentAsync(assignment);
                                stop.CompartmentAssignments.Add(assignment);
                            }
                            else
                            {
                                assignment.CompartmentId = sDto.CompartmentId;
                                assignment.UpdatedAt = DateTime.Now;
                            }
                        }

                        // Xử lý prescription code nếu category là thuốc
                        var patient = await _repoPatient.GetByIdAsync(sDto.PatientId)
                            ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân.");

                        bool isMedicineCategory = IsMedicineRelatedCategory(comp.Category);
                        Prescription? rx = null;
                        string autoName = "";
                        string itemDesc = "";

                        if (isMedicineCategory)
                        {
                            // Nếu là loại ngăn chứa thuốc, yêu cầu đơn thuốc được xác nhận
                            if (string.IsNullOrWhiteSpace(sDto.PrescriptionCode))
                                throw new InvalidOperationException(
                                    $"Loại ngăn chứa '{comp.Category?.Name ?? "N/A"}' liên quan đến thuốc. " +
                                    "Vui lòng chọn và xác nhận đơn thuốc cho bệnh nhân này."
                                );

                            // Lấy đơn thuốc theo mã code
                            rx = await _repo.GetPrescriptionByCodeAsync(sDto.PrescriptionCode)
                                ?? throw new InvalidOperationException(
                                    $"Không tìm thấy đơn thuốc với mã '{sDto.PrescriptionCode}'."
                                );

                            // Kiểm tra đơn thuốc thuộc về bệnh nhân này
                            if (rx.PatientId != sDto.PatientId)
                                throw new InvalidOperationException(
                                    $"Đơn thuốc '{sDto.PrescriptionCode}' không thuộc về bệnh nhân này."
                                );

                            // Kiểm tra đơn thuốc đã được xác nhận (phải là approved)
                            if (rx.Status?.ToLower() != "approved")
                                throw new InvalidOperationException(
                                    $"Đơn thuốc '{sDto.PrescriptionCode}' chưa được xác nhận. " +
                                    $"Trạng thái hiện tại: {rx.Status}. Vui lòng xác nhận đơn thuốc trước khi cập nhật task."
                                );

                            // Tạo autoName và itemDesc từ đơn thuốc (giữ lại để lưu lịch sử)
                            autoName = $"{patient.FullName} - {patient.PatientCode} - {rx.PrescriptionCode}";
                            autoName += " - " + string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));

                            itemDesc = $"RX#{rx.PrescriptionCode}: " +
                                string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));
                        }
                        else
                        {
                            // Nếu không phải thuốc, không cần đơn thuốc
                            autoName = $"{patient.FullName} - {patient.PatientCode}";
                            itemDesc = "Vật phẩm khác";
                        }

                        // CustomName
                        if (!string.IsNullOrWhiteSpace(sDto.CustomName))
                            stop.CustomName = sDto.CustomName.Trim();
                        else
                            stop.CustomName = autoName; // Dùng autoName nếu không có CustomName

                        // ItemDesc
                        if (assignment != null)
                        {
                            if (!string.IsNullOrWhiteSpace(sDto.ItemDesc))
                            {
                                assignment.ItemDesc = sDto.ItemDesc.Trim();
                            }
                            else
                            {
                                assignment.ItemDesc = itemDesc; // Dùng itemDesc từ prescription nếu không có ItemDesc
                            }

                            assignment.UpdatedAt = DateTime.Now;
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
                    task.UpdatedAt = DateTime.Now;

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

        // Helper method: Kiểm tra Category có liên quan đến thuốc không
        // Dựa vào tên category (kiểm tra các từ khóa liên quan đến thuốc)
        private bool IsMedicineRelatedCategory(CompartmentCategory? category)
        {
            if (category == null || string.IsNullOrWhiteSpace(category.Name))
                return false;

            var categoryName = category.Name.ToLower().Trim();
            
            // Kiểm tra các từ khóa liên quan đến thuốc
            var medicineKeywords = new[] { "thuốc", "medicine", "drug", "medication", "dược phẩm", "pharmaceutical" };
            
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
            stop.UpdatedAt = DateTime.Now;

            // ============================================================
            // AUTO COMPLETE TASK NẾU TẤT CẢ STOP = delivered
            // ============================================================
            bool allDelivered = task.TaskStops.Any() &&
                task.TaskStops.All(s => string.Equals(s.Status, "delivered", StringComparison.OrdinalIgnoreCase));

            if (allDelivered)
            {
                task.Status = "completed";
                task.UpdatedAt = DateTime.Now;

                await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                // Giải phóng khoang
                foreach (var s in task.TaskStops)
                {
                    foreach (var a in s.CompartmentAssignments)
                    {
                        await _repoRobotCom.ReleaseCompartmentAsync(a.CompartmentId);
                    }
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

            // Update all stops
            foreach (var stop in task.TaskStops)
            {
                stop.Status = "delivered";
                stop.UpdatedAt = DateTime.Now;

                foreach (var assign in stop.CompartmentAssignments)
                {
                    assign.Status = "delivered";
                    assign.UpdatedAt = DateTime.Now;
                }
            }

            // Task
            task.Status = "completed";
            task.UpdatedAt = DateTime.Now;

            await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

            // Release all compartments
            foreach (var stop in task.TaskStops)
            {
                foreach (var a in stop.CompartmentAssignments)
                    await _repoRobotCom.ReleaseCompartmentAsync(a.CompartmentId);
            }

            await _repo.SaveChangesAsync();
            await RecordTaskHistory(task);
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
                if (task.ScheduledStartAt.HasValue && task.ScheduledStartAt.Value > DateTime.Now)
                {
                    startedEarlyMinutes = Math.Round((task.ScheduledStartAt.Value - DateTime.Now).TotalMinutes, 1);
                }

                // === CHUYỂN TRẠNG THÁI ===
                task.Status = "in_progress";
                task.StartedAt = DateTime.Now;
                task.UpdatedAt = DateTime.Now;

                robot.Status = "transporting";
                await _repo.UpdateRobotStatusAsync(robot.Id, "transporting");

                await _repo.SaveChangesAsync();
                await transaction.CommitAsync();

                // GHI LỊCH SỬ CÓ GHI CHÚ CHẠY SỚM
                var fullTask = await _repo.GetByIdAsync(task.Id);
                await RecordTaskHistory(fullTask!, startedEarlyMinutes);

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
                var now = DateTime.Now;
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
                    task.UpdatedAt = DateTime.Now;

                    // 2. Robot về trạm
                    await _repo.UpdateRobotStatusAsync(task.RobotId, "at_station");

                    // 3. Giải phóng tất cả khoang chứa
                    foreach (var stop in task.TaskStops)
                    {
                        foreach (var assignment in stop.CompartmentAssignments)
                        {
                            await _repoRobotCom.ReleaseCompartmentAsync(assignment.CompartmentId);
                        }
                    }

                    await _repo.SaveChangesAsync();

                    // TÍNH SỐ PHÚT QUÁ GIỜ
                    var overdueMinutes = task.ScheduledStartAt.HasValue
                        ? Math.Round((DateTime.Now - task.ScheduledStartAt.Value).TotalMinutes, 1)
                        : GracePeriodMinutes;

                    // TẠO GHI CHÚ ĐẸP
                    var cancelNote = $"Nhiệm vụ bị hủy tự động do quá giờ khởi hành {overdueMinutes:F1} phút";

                    await RecordTaskHistory(task, cancelNote: cancelNote);

                    // 4. Gửi SignalR thông báo
                    var canceledTaskResponse = MapToResponse(task);

                    await _taskHub.Clients.Group("AllTasks").SendAsync("TaskCanceled", new
                    {
                        taskId = task.Id,
                        reason = $"Quá giờ khởi hành hơn {GracePeriodMinutes} phút",
                        canceledAt = DateTime.Now,
                        task = canceledTaskResponse
                    });

                    // Gửi riêng cho robot liên quan (nếu cần)
                    var robot = await _repo.GetRobotAsync(task.RobotId);
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
                task.UpdatedAt = DateTime.Now;

                // 2. Đổi status của tất cả stops thành "canceled" hoặc "skipped"
                foreach (var stop in task.TaskStops)
                {
                    // Chỉ đổi status nếu chưa delivered
                    if (stop.Status != "delivered")
                    {
                        stop.Status = "skipped";
                        stop.UpdatedAt = DateTime.Now;
                    }

                    // Đổi status của tất cả assignments
                    foreach (var assignment in stop.CompartmentAssignments)
                    {
                        if (assignment.Status != "delivered")
                        {
                            assignment.Status = "canceled";
                            assignment.UpdatedAt = DateTime.Now;
                        }
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

                // 7. Lấy task đã cập nhật và trả về
                var updatedTask = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(updatedTask!);

                // 8. Gửi SignalR thông báo
                await _taskHub.Clients.All.SendAsync("TaskCanceled", new
                {
                    taskId = task.Id,
                    reason = reason ?? "Hủy thủ công",
                    canceledAt = DateTime.Now,
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


