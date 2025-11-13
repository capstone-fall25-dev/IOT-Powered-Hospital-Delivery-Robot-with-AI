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
        private readonly IHubContext<TaskHub> _taskHub;

        public TaskService(ITaskRepository repo, IRobotRepository repoRobot, IRobotCompartmentRepository repoRobotCom, IHubContext<TaskHub> taskHub)
        {
            _repo = repo;
            _repoRobot = repoRobot;
            _repoRobotCom = repoRobotCom;
            _taskHub = taskHub;
        }

        public async Task<IEnumerable<TaskResponseDto>> GetAllAsync(TaskFilterDto? filter)
        {
            var tasks = await _repo.GetAllAsync(filter);
            return tasks.Select(MapToResponse);
        }

        public async Task<TaskResponseDto?> GetByIdAsync(ulong id)
        {
            var t = await _repo.GetByIdAsync(id);
            return t == null ? null : MapToResponse(t);
        }

        public async Task<TaskResponseDto> CreateAsync(CreateTaskDto dto, ulong currentUserId)
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

            try
            {
                // ===== Bước 4: tạo Stop + gán Compartment =====
                foreach (var s in dto.Stops.OrderBy(x => x.SeqNo))
                {
                    var comp = await _repo.GetCompartmentAsync(s.CompartmentId)
                        ?? throw new InvalidOperationException($"Khoang {s.CompartmentId} không tồn tại.");

                    // ❗ Kiểm tra khoang có đang bận không
                    if (await _repo.IsCompartmentBusyAsync(s.CompartmentId))
                        throw new InvalidOperationException($"Khoang {s.CompartmentId} đang được sử dụng.");

                    // ❗ KIỂM TRA PATIENT / CATEGORY LOGIC
                    if (comp.PatientId != null)
                    {
                        // Khoang đang có bệnh nhân khác → không thể đổi bệnh nhân hoặc đổi category
                        if (comp.PatientId != s.PatientId)
                            throw new InvalidOperationException(
                                $"Khoang {comp.Id} đang chứa bệnh nhân {comp.PatientId}, không thể đổi sang bệnh nhân {s.PatientId}."
                            );

                        if (comp.CategoryId != s.CategoryId)
                            throw new InvalidOperationException(
                                $"Khoang {comp.Id} đã được gán loại Category {comp.CategoryId}, không thể đổi sang Category {s.CategoryId}."
                            );
                    }
                    else
                    {
                        // Khoang TRỐNG → được quyền đổi Category
                        if (comp.CategoryId != s.CategoryId)
                            await _repoRobotCom.AssignCategoryToCompartment(comp.Id, s.CategoryId);

                        // Khoang TRỐNG → được quyền đổi Patient
                        if (comp.PatientId != s.PatientId)
                            await _repoRobotCom.AssignPatientToCompartment(comp.Id, s.PatientId);
                    }

                    var rx = await _repo.GetLatestPrescriptionForPatientAsync(s.PatientId)
                        ?? throw new InvalidOperationException($"Bệnh nhân {s.PatientId} chưa có đơn thuốc hợp lệ.");

                    // Tạo stop
                    var stop = new TaskStop
                    {
                        TaskId = task.Id,
                        SeqNo = s.SeqNo,
                        DestinationId = s.DestinationId,
                        PatientId = s.PatientId,
                        Status = "pending",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    stop = await _repo.CreateStopAsync(stop);

                    // Tạo assignment
                    var desc = string.Join("; ", rx.PrescriptionItems.Select(i => $"{i.Medicine.Name} x {i.Quantity}"));
                    await _repo.CreateAssignmentAsync(new CompartmentAssignment
                    {
                        TaskId = task.Id,
                        StopId = stop.Id,
                        CompartmentId = s.CompartmentId,
                        ItemDesc = $"RX#{rx.PrescriptionCode}: {desc}",
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

                var result = await _repo.GetByIdAsync(task.Id);
                var response = MapToResponse(result!);

                // Gửi realtime đến client
                await _taskHub.Clients.All.SendAsync("TaskCreated", response);

                return response;
            }
            catch (Exception ex)
            {
                // rollback robot về trạng thái an toàn
                await _repo.UpdateRobotStatusAsync(robot.Id, "at_station");
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
                                    MedicineId = i.MedicineId,
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
    }
}
