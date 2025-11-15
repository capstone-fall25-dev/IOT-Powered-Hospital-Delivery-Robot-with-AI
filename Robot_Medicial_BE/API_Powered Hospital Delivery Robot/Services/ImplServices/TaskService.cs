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

        public async Task<TaskDetailDto?> GetByIdAsync(ulong id)
        {
            var task = await _repo.GetByIdAsync(id);
            return task == null ? null : MapToDetail(task);
        }

        public async Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, ulong currentUserId)
        {
            // 🧨 BẮT ĐẦU TRANSACTION
            using var transaction = await _repo.BeginTransactionAsync();

            try
            {
                var map = await _repo.GetMapAsync(dto.MapId)
                ?? throw new InvalidOperationException("Bản đồ không tồn tại.");

                var robot = await _repo.GetRobotAsync(dto.RobotId)
                    ?? throw new InvalidOperationException("Robot không tồn tại.");

                // BƯỚC 1: TỰ ĐỘNG CẬP NHẬT MAP CHO ROBOT
                if (robot.MapId != dto.MapId)
                {
                    var updated = await _repoRobot.AssignMapToRobotAsync(robot.Id, dto.MapId);
                    if (updated == null)
                        throw new InvalidOperationException("Không thể gán map mới cho robot.");
                }

                // BƯỚC 2: Ngăn robot đang vận hành bị gán thêm task. Robot chỉ nhận task nếu at_station
                if (robot.Status != "at_station")
                    throw new InvalidOperationException(
                        $"Robot {robot.Name} đang ở trạng thái '{robot.Status}', KHÔNG thể nhận nhiệm vụ mới. Robot chỉ có thể nhận task khi đang 'at_station'."
                    );

                // ===== Bước 3: tạo Task ở trạng thái pending =====
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

                // ===== Bước 4: tạo Stop + gán Compartment =====
                foreach (var s in dto.Stops.OrderBy(x => x.SeqNo))
                {
                    var comp = await _repo.GetCompartmentAsync(s.CompartmentId)
                        ?? throw new InvalidOperationException($"Khoang {s.CompartmentId} không tồn tại.");

                    // Kiểm tra khoang có đang bận không
                    if (await _repo.IsCompartmentBusyAsync(s.CompartmentId))
                        throw new InvalidOperationException($"Khoang {s.CompartmentId} đang được sử dụng.");

                    // Compartment locked => không được chọn
                    if (comp.Status == "locked")
                    {
                        throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang bị khóa.");
                    }

                    // Nếu compartment đã có Category → bắt buộc phải trùng với Category đã chọn
                    if (comp.CategoryId != null && comp.CategoryId != s.CategoryId)
                    {
                        throw new InvalidOperationException(
                            $"Khoang {comp.CompartmentCode} chỉ hỗ trợ Category {comp.CategoryId}, không thể chọn Category {s.CategoryId}."
                        );
                    }

                    // Nếu compartment chưa có Category → cho phép gán
                    if (comp.CategoryId == null)
                    {
                        await _repoRobotCom.AssignCategoryToCompartment(comp.Id, s.CategoryId);
                    }

                    // Nếu compartment đã có bệnh nhân → phải trùng bệnh nhân
                    if (comp.PatientId != null && comp.PatientId != s.PatientId)
                    {
                        throw new InvalidOperationException(
                            $"Khoang {comp.CompartmentCode} đang chứa bệnh nhân ID = {comp.PatientId}, không thể đổi sang bệnh nhân {s.PatientId}."
                        );
                    }

                    // Nếu chưa có bệnh nhân → gán mới
                    if (comp.PatientId == null)
                    {
                        await _repoRobotCom.AssignPatientToCompartment(comp.Id, s.PatientId);
                    }

                    // ===== LẤY ĐƠN THUỐC =====
                    var rx = await _repo.GetLatestPrescriptionForPatientAsync(s.PatientId)
                    ?? throw new InvalidOperationException($"Bệnh nhân {s.PatientId} chưa có đơn thuốc hợp lệ.");

                    var patient = await _repoPatient.GetByIdAsync(s.PatientId)
                        ?? throw new InvalidOperationException("Không tìm thấy bệnh nhân.");

                    // ===== AUTO NAME FORMAT =====
                    string autoName = $"{patient.FullName} - {patient.PatientCode} - {rx.PrescriptionCode}";

                    var itemList = string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));
                    autoName += $" - {itemList}";

                    // Nếu CustomName null hoặc empty → dùng autoName
                    string finalName = string.IsNullOrWhiteSpace(s.CustomName) ? autoName : s.CustomName!.Trim();

                    // Tạo stop
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

                    // Tạo assignment
                    // Nếu FE nhập itemDesc → dùng FE
                    // Nếu không → Auto generate theo prescription
                    string itemDesc;
                    if (!string.IsNullOrWhiteSpace(s.ItemDesc))
                    {
                        itemDesc = s.ItemDesc.Trim();
                    }
                    else
                    {
                        var auto = string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));
                        itemDesc = $"RX#{rx.PrescriptionCode}: {auto}";
                    }

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

                // ===== Bước 5: đổi trạng thái Task và Robot =====
                task.Status = "in_progress";
                await _repo.UpdateAsync(task.Id, task);

                robot.Status = "transporting";
                await _repo.UpdateRobotStatusAsync(robot.Id, robot.Status);

                await transaction.CommitAsync(); // 🔥 COMMIT

                var result = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(result!);

                // Gửi realtime đến client
                await _taskHub.Clients.All.SendAsync("TaskCreated", response);

                return response;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync(); // 🔥 ROLLBACK nếu lỗi
                throw new InvalidOperationException($"Tạo nhiệm vụ thất bại: {ex.Message}");
            }
        }

        public async Task<TaskEditDto?> GetEditDataAsync(ulong id)
        {
            var task = await _repo.GetByIdAsync(id);
            if (task == null) return null;

            return MapToEdit(task);
        }

        public async Task<TaskResponseDto?> UpdateAsync(ulong id, UpdateTaskDto dto)
        {
            using var transaction = await _repo.BeginTransactionAsync();

            try
            {
                var task = await _repo.GetByIdAsync(id)
                    ?? throw new InvalidOperationException("Không tìm thấy nhiệm vụ.");

                // ============== 1. Validate điều kiện cho phép edit ==============
                // Chỉ cho phép edit nếu:
                //  - Task đang pending, hoặc
                //  - Task in_progress nhưng CHƯA đến giờ ScheduledStartAt

                if (task.Status != "pending")
                {
                    if (task.ScheduledStartAt.HasValue &&
                        DateTime.UtcNow >= task.ScheduledStartAt.Value)
                    {
                        throw new InvalidOperationException(
                            "Nhiệm vụ đã đến giờ khởi hành hoặc đang thực hiện, không thể chỉnh sửa.");
                    }
                }

                // ============== 2. Đổi Robot (nếu có) ============================
                Robot? currentRobot = null;

                if (dto.RobotId.HasValue && dto.RobotId.Value != task.RobotId)
                {
                    var oldRobot = await _repo.GetRobotAsync(task.RobotId)
                        ?? throw new InvalidOperationException("Robot cũ không tồn tại.");

                    var newRobot = await _repo.GetRobotAsync(dto.RobotId.Value)
                        ?? throw new InvalidOperationException("Robot mới không tồn tại.");

                    if (newRobot.Status != "at_station")
                        throw new InvalidOperationException("Robot mới đang bận, không thể gán nhiệm vụ.");

                    // Trả robot cũ về at_station (tuỳ nghiệp vụ, bạn có thể bỏ nếu không muốn)
                    oldRobot.Status = "at_station";
                    await _repo.UpdateRobotStatusAsync(oldRobot.Id, oldRobot.Status);

                    // Gán robot mới cho task
                    task.RobotId = dto.RobotId.Value;

                    // Set robot mới sang transporting (vì task này đã được assign)
                    newRobot.Status = "transporting";
                    await _repo.UpdateRobotStatusAsync(newRobot.Id, newRobot.Status);

                    currentRobot = newRobot;
                }
                else
                {
                    currentRobot = await _repo.GetRobotAsync(task.RobotId)
                        ?? throw new InvalidOperationException("Robot không tồn tại.");
                }

                // ============== 3. Đổi Map (nếu có) ==============================
                if (dto.MapId.HasValue && dto.MapId.Value != task.MapId)
                {
                    var map = await _repo.GetMapAsync(dto.MapId.Value)
                        ?? throw new InvalidOperationException("Bản đồ không tồn tại.");

                    task.MapId = dto.MapId.Value;

                    // đảm bảo robot hiện tại đang gán đúng map
                    if (currentRobot.MapId != task.MapId)
                    {
                        var updated = await _repoRobot.AssignMapToRobotAsync(currentRobot.Id, task.MapId!.Value);
                        if (updated == null)
                            throw new InvalidOperationException("Không thể gán map mới cho robot.");
                    }
                }
                else
                {
                    // nếu map không đổi nhưng robot đổi, cũng cần đảm bảo robot mới có map này
                    if (currentRobot.MapId != task.MapId)
                    {
                        var updated = await _repoRobot.AssignMapToRobotAsync(currentRobot.Id, task.MapId!.Value);
                        if (updated == null)
                            throw new InvalidOperationException("Không thể gán map hiện tại cho robot mới.");
                    }
                }

                // ============== 4. Header Task: Priority, Scheduled, Status ======
                if (dto.Priority.HasValue)
                    task.Priority = dto.Priority.ToString();

                if (dto.ScheduledStartAt.HasValue)
                    task.ScheduledStartAt = dto.ScheduledStartAt.Value;

                if (!string.IsNullOrWhiteSpace(dto.Status))
                    task.Status = dto.Status!.Trim();

                task.UpdatedAt = DateTime.UtcNow;

                // ============== 5. Update từng Stop (nếu có) =====================
                if (dto.Stops != null && dto.Stops.Any())
                {
                    foreach (var sDto in dto.Stops)
                    {
                        var stop = task.TaskStops.FirstOrDefault(x => x.Id == sDto.StopId);
                        if (stop == null)
                            throw new InvalidOperationException($"Không tìm thấy điểm dừng Id = {sDto.StopId}.");

                        // ---- Update Seq + Destination + Patient ----
                        stop.SeqNo = sDto.SeqNo;
                        stop.DestinationId = sDto.DestinationId;
                        stop.PatientId = sDto.PatientId;
                        stop.UpdatedAt = DateTime.UtcNow;

                        // Lấy assignment hiện tại (mỗi stop 1 assignment)
                        var assignment = stop.CompartmentAssignments.FirstOrDefault();

                        // Nếu đổi compartment
                        var isChangingCompartment = assignment == null ||
                                                    assignment.CompartmentId != sDto.CompartmentId;

                        if (isChangingCompartment)
                        {
                            var comp = await _repo.GetCompartmentAsync(sDto.CompartmentId)
                                ?? throw new InvalidOperationException($"Khoang {sDto.CompartmentId} không tồn tại.");

                            if (comp.Status == "locked")
                                throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang bị khóa.");

                            // nếu compartment đã có category → phải trùng
                            if (comp.CategoryId != null && comp.CategoryId != sDto.CategoryId)
                            {
                                throw new InvalidOperationException(
                                    $"Khoang {comp.CompartmentCode} chỉ hỗ trợ Category {comp.CategoryId}, không thể chọn Category {sDto.CategoryId}.");
                            }

                            // nếu compartment chưa có category → gán mới
                            if (comp.CategoryId == null)
                            {
                                await _repoRobotCom.AssignCategoryToCompartment(comp.Id, sDto.CategoryId);
                            }

                            // bệnh nhân trong compartment
                            if (comp.PatientId != null && comp.PatientId != sDto.PatientId)
                            {
                                throw new InvalidOperationException(
                                    $"Khoang {comp.CompartmentCode} đang gắn với bệnh nhân ID = {comp.PatientId}, không thể đổi sang bệnh nhân {sDto.PatientId}.");
                            }

                            if (comp.PatientId == null)
                            {
                                await _repoRobotCom.AssignPatientToCompartment(comp.Id, sDto.PatientId);
                            }

                            // check khoang có đang bị task khác dùng không
                            if (assignment == null || assignment.CompartmentId != sDto.CompartmentId)
                            {
                                var isBusy = await _repo.IsCompartmentBusyAsync(sDto.CompartmentId);
                                if (isBusy)
                                    throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang được sử dụng bởi nhiệm vụ khác.");
                            }

                            // nếu chưa có assignment → tạo mới
                            if (assignment == null)
                            {
                                assignment = new CompartmentAssignment
                                {
                                    TaskId = task.Id,
                                    StopId = stop.Id,
                                    CompartmentId = sDto.CompartmentId,
                                    Status = "pending",
                                    CreatedAt = DateTime.UtcNow,
                                    UpdatedAt = DateTime.UtcNow
                                };
                                _ = await _repo.CreateAssignmentAsync(assignment);
                                // add vào navigation để mapToResponse sau này nhìn thấy
                                stop.CompartmentAssignments.Add(assignment);
                            }
                            else
                            {
                                assignment.CompartmentId = sDto.CompartmentId;
                                assignment.UpdatedAt = DateTime.UtcNow;
                            }
                        }
                        else
                        {
                            // compartment giữ nguyên → vẫn cần validate category / patient
                            var comp = await _repo.GetCompartmentAsync(assignment!.CompartmentId)
                                ?? throw new InvalidOperationException("Khoang không tồn tại.");

                            if (comp.Status == "locked")
                                throw new InvalidOperationException($"Khoang {comp.CompartmentCode} đang bị khóa.");

                            if (comp.CategoryId != null && comp.CategoryId != sDto.CategoryId)
                                throw new InvalidOperationException(
                                    $"Khoang {comp.CompartmentCode} chỉ hỗ trợ Category {comp.CategoryId}, không thể chọn Category {sDto.CategoryId}.");

                            if (comp.CategoryId == null)
                                await _repoRobotCom.AssignCategoryToCompartment(comp.Id, sDto.CategoryId);

                            if (comp.PatientId != null && comp.PatientId != sDto.PatientId)
                                throw new InvalidOperationException(
                                    $"Khoang {comp.CompartmentCode} đang gắn với bệnh nhân ID = {comp.PatientId}, không thể đổi sang bệnh nhân {sDto.PatientId}.");

                            if (comp.PatientId == null)
                                await _repoRobotCom.AssignPatientToCompartment(comp.Id, sDto.PatientId);
                        }

                        // ----- ItemDesc / CustomName / Auto generate -----
                        // nếu CustomName gửi lên → update
                        if (!string.IsNullOrWhiteSpace(sDto.CustomName))
                            stop.CustomName = sDto.CustomName!.Trim();

                        // ItemDesc:
                        if (assignment != null)
                        {
                            if (!string.IsNullOrWhiteSpace(sDto.ItemDesc))
                            {
                                assignment.ItemDesc = sDto.ItemDesc!.Trim();
                            }
                            else
                            {
                                // nếu FE không truyền itemDesc mới → có thể giữ nguyên, hoặc auto regen
                                // Ở đây: nếu đang rỗng thì auto lấy theo đơn thuốc mới nhất
                                if (string.IsNullOrWhiteSpace(assignment.ItemDesc))
                                {
                                    if (stop.PatientId == null)
                                        throw new InvalidOperationException("Điểm dừng không có bệnh nhân hợp lệ.");

                                    var rx = await _repo.GetLatestPrescriptionForPatientAsync(stop.PatientId.Value)
                                        ?? throw new InvalidOperationException("Bệnh nhân chưa có đơn thuốc hợp lệ.");

                                    var auto = string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));
                                    assignment.ItemDesc = $"RX#{rx.PrescriptionCode}: {auto}";
                                }
                            }

                            assignment.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }

                // Lưu thay đổi
                await _repo.SaveChangesAsync();
                await transaction.CommitAsync();

                // Load lại để map ra DTO chuẩn
                var result = await _repo.GetByIdAsync(task.Id);
                if (result == null) return null;

                var response = MapToResponse(result);
                await _taskHub.Clients.All.SendAsync("TaskUpdated", response);

                return response;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new InvalidOperationException($"Cập nhật nhiệm vụ thất bại: {ex.Message}");
            }
        }

        public Task<bool> DeleteAsync(ulong id) => _repo.DeleteAsync(id);

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
                    var assignment = s.CompartmentAssignments.FirstOrDefault();
                    var rxCode = assignment?.ItemDesc.Split(':').FirstOrDefault()?.Replace("RX#", "")?.Trim() ?? "";

                    // Lấy đơn thuốc từ DB
                    var rx = _repo.GetPrescriptionByCodeAsync(rxCode).Result;

                    return new TaskStopResponseDto
                    {
                        SeqNo = s.SeqNo,
                        PatientName = s.Patient?.FullName,
                        DestinationName = s.Destination?.Name,
                        CompartmentCode = assignment?.Compartment?.CompartmentCode,
                        Prescription = rx != null
                            ? new PrescriptionSummaryDto
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
                            : null
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

                Stops = task.TaskStops
                    .OrderBy(s => s.SeqNo)
                    .Select(s =>
                    {
                        var assignment = s.CompartmentAssignments.FirstOrDefault();

                        // Lấy đơn thuốc newest của bệnh nhân (đã include trong repository)
                        var rx = s.Patient?.Prescriptions?
                            .OrderByDescending(p => p.CreatedAt)
                            .FirstOrDefault();

                        return new TaskDetailStopDto
                        {
                            SeqNo = s.SeqNo,

                            // DESTINATION
                            DestinationName = s.Destination?.Name ?? "",

                            // PATIENT
                            PatientName = s.Patient?.FullName ?? "",
                            PatientCode = s.Patient?.PatientCode ?? "",
                            RoomNumber = s.Patient?.RoomNumber,
                            Department = s.Patient?.Department,

                            // COMPARTMENT
                            CompartmentCode = assignment?.Compartment?.CompartmentCode ?? "",
                            CompartmentStatus = assignment?.Compartment?.Status ?? "",
                            CompartmentCategory = assignment?.Compartment?.Category?.Name,

                            // ASSIGNMENT
                            ItemDesc = assignment?.ItemDesc ?? "",
                            AssignmentStatus = assignment?.Status ?? "",

                            // PRESCRIPTION (FULL)
                            Prescription = rx == null ? null : new PrescriptionFullDto
                            {
                                PrescriptionCode = rx.PrescriptionCode,
                                CreatedAt = rx.CreatedAt ?? DateTime.MinValue,     // tránh lỗi nullable
                                Status = rx.Status,

                                Items = rx.PrescriptionItems.Select(i => new PrescriptionItemResponseDto
                                {
                                    Id = i.Id,
                                    MedicineName = i.Medicine.Name,
                                    MedicineCode = i.Medicine.MedicineCode,
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
                MapId = task.MapId ?? 0UL,          // SAFE
                RobotId = task.RobotId,

                Priority = Enum.TryParse<TaskPriority>(task.Priority, out var p) ? p : TaskPriority.Normal,
                ScheduledStartAt = task.ScheduledStartAt,

                Stops = task.TaskStops
                    .OrderBy(s => s.SeqNo)
                    .Select(s =>
                    {
                        var assignment = s.CompartmentAssignments.FirstOrDefault();

                        return new TaskEditStopDto
                        {
                            StopId = s.Id,
                            SeqNo = s.SeqNo,

                            DestinationId = s.DestinationId ?? 0UL,
                            PatientId = s.PatientId ?? 0UL,

                            CategoryId = assignment?.Compartment?.CategoryId ?? 0UL,
                            CompartmentId = assignment?.CompartmentId ?? 0UL,

                            CustomName = s.CustomName,
                            ItemDesc = assignment?.ItemDesc
                        };
                    }).ToList()
            };
        }
    }
}
