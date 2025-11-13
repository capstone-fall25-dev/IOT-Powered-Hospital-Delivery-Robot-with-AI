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
        private readonly IHubContext<TaskHub> _taskHub;

        public TaskService(ITaskRepository repo, IHubContext<TaskHub> taskHub)
        {
            _repo = repo;
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

            // Ngăn robot đang vận hành bị gán thêm task
            if (robot.Status != "at_station" && robot.Status != "completed")
                throw new InvalidOperationException($"Robot {robot.Name} hiện đang ở trạng thái {robot.Status}, không thể giao nhiệm vụ mới.");

            // ===== Bước 1: tạo Task ở trạng thái pending =====
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
                // ===== Bước 2: tạo Stop + gán Compartment =====
                foreach (var s in dto.Stops.OrderBy(x => x.SeqNo))
                {
                    var comp = await _repo.GetCompartmentAsync(s.CompartmentId)
                        ?? throw new InvalidOperationException($"Khoang {s.CompartmentId} không tồn tại.");

                    if (await _repo.IsCompartmentBusyAsync(s.CompartmentId))
                        throw new InvalidOperationException($"Khoang {s.CompartmentId} đang được sử dụng.");

                    var rx = await _repo.GetLatestPrescriptionForPatientAsync(s.PatientId)
                        ?? throw new InvalidOperationException($"Bệnh nhân {s.PatientId} chưa có đơn thuốc hợp lệ.");

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

                // ===== Bước 3: đổi trạng thái Task và Robot =====
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
            var task = await _repo.GetByIdAsync(id) ?? throw new InvalidOperationException("Không tìm thấy nhiệm vụ.");
            if (!string.IsNullOrEmpty(dto.Status)) task.Status = dto.Status;
            if (dto.Priority.HasValue) task.Priority = dto.Priority.ToString();
            var updated = await _repo.UpdateAsync(id, task);
            if (updated != null)
            {
                var response = MapToResponse(updated);
                await _taskHub.Clients.All.SendAsync("TaskUpdated", response);
                return response;
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
