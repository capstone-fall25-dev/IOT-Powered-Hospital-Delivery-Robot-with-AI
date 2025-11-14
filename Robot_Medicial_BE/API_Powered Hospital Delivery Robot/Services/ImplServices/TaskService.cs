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

        public async Task<TaskResponseDto?> UpdateAsync(ulong id, UpdateTaskDto dto)
        {
            var task = await _repo.GetByIdAsync(id)
                ?? throw new InvalidOperationException("Không tìm thấy nhiệm vụ.");

            if (!string.IsNullOrEmpty(dto.Status))
                task.Status = dto.Status;

            if (dto.Priority.HasValue)
                task.Priority = dto.Priority.ToString();

            var updated = await _repo.UpdateAsync(id, task);
            if (updated != null)
            {
                var res = MapToResponse(updated);
                await _taskHub.Clients.All.SendAsync("TaskUpdated", res);
                return res;
            }

            return null;
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
    }
}
