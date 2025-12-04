using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý gán ngăn chứa cho nhiệm vụ
    /// </summary>
    public class CompartmentAssignmentService : ICompartmentAssignmentService
    {
        private readonly ICompartmentAssignmentRepository _repository;
        private readonly IMapper _mapper;
        private readonly ITaskRepository _taskRepository;
        private readonly IRobotRepository _robotRepository;
        private readonly ILogRepository _logRepository;

        // Các trạng thái hợp lệ cho validation
        private readonly string[] ValidStatuses = { "pending", "assigned", "completed", "failed" };

        public CompartmentAssignmentService(
            ICompartmentAssignmentRepository repository,
            IMapper mapper,
            ITaskRepository taskRepository,
            IRobotRepository robotRepository,
            ILogRepository logRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _taskRepository = taskRepository;
            _robotRepository = robotRepository;
            _logRepository = logRepository;
        }

        /// <summary>
        /// Nạp hàng loạt ngăn chứa cho một nhiệm vụ
        /// </summary>
        public async Task<IEnumerable<CompartmentAssignmentResponseDto>> BulkLoadForTaskAsync(ulong taskId, List<LoadCompartmentDto> loadDtos)
        {
            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null || task.Status != "pending")
            {
                throw new InvalidOperationException("Nhiệm vụ phải ở trạng thái pending");
            }

            var assignments = await _repository.GetAllAsync(taskId: taskId, status: "pending");
            if (assignments.Count() != loadDtos.Count)
            {
                throw new ArgumentException("Số lượng DTO nạp phải khớp với số lượng assignment pending");
            }

            var loadedAssignments = new List<CompartmentAssignmentResponseDto>();
            for (int i = 0; i < assignments.Count(); i++)
            {
                var assignment = assignments.ElementAt(i);
                var loadDto = loadDtos[i];
                var loaded = await LoadAsync(assignment.Id, loadDto); // Tái sử dụng method LoadAsync
                if (loaded != null) loadedAssignments.Add(loaded);
            }

            // Ghi log nạp hàng loạt
            var bulkLog = new Log
            {
                RobotId = task.RobotId,
                TaskId = taskId,
                LogType = "info",
                Message = $"Đã nạp hàng loạt {loadedAssignments.Count} ngăn chứa cho nhiệm vụ {taskId}",
                CreatedAt = DateTime.Now
            };
            await _logRepository.CreateAsync(bulkLog);

            return loadedAssignments;
        }

        /// <summary>
        /// Tạo gán ngăn chứa mới
        /// </summary>
        public async Task<CompartmentAssignmentResponseDto> CreateAsync(CompartmentAssignmentDto assignmentDto)
        {
            // Kiểm tra Task và Stop tồn tại
            var task = await _taskRepository.GetByIdAsync(assignmentDto.TaskId);
            if (task == null)
            {
                throw new InvalidOperationException("Không tìm thấy nhiệm vụ");
            }

            var stop = task.TaskStops.FirstOrDefault(ts => ts.Id == assignmentDto.StopId);
            if (stop == null)
            {
                throw new InvalidOperationException("Không tìm thấy điểm dừng trong nhiệm vụ");
            }

            // Kiểm tra Compartment (phải thuộc robot của task)
            if (assignmentDto.CompartmentId.HasValue)
            {
                var robot = await _robotRepository.GetByIdAsync(task.RobotId);
                var compartment = robot?.RobotCompartments.FirstOrDefault(c => c.Id == assignmentDto.CompartmentId.Value);
                if (compartment == null)
                {
                    throw new InvalidOperationException("Không tìm thấy ngăn chứa trong robot");
                }
            }

            var assignment = _mapper.Map<CompartmentAssignment>(assignmentDto);
            assignment.CreatedAt = DateTime.Now;
            assignment.UpdatedAt = DateTime.Now;

            var created = await _repository.CreateAsync(assignment);
            return _mapper.Map<CompartmentAssignmentResponseDto>(created);
        }

        /// <summary>
        /// Lấy danh sách gán ngăn chứa (có thể lọc theo nhiệm vụ, trạng thái)
        /// </summary>
        public async Task<IEnumerable<CompartmentAssignmentResponseDto>> GetAllAsync(ulong? taskId = null, string? status = null)
        {
            var assignments = await _repository.GetAllAsync(taskId, status);
            return _mapper.Map<IEnumerable<CompartmentAssignmentResponseDto>>(assignments);
        }

        /// <summary>
        /// Lấy chi tiết gán ngăn chứa theo ID
        /// </summary>
        public async Task<CompartmentAssignmentResponseDto?> GetByIdAsync(ulong id)
        {
            var assignment = await _repository.GetByIdAsync(id);
            return assignment != null ? _mapper.Map<CompartmentAssignmentResponseDto>(assignment) : null;
        }

        /// <summary>
        /// Nạp hàng vào ngăn chứa
        /// </summary>
        public async Task<CompartmentAssignmentResponseDto?> LoadAsync(ulong id, LoadCompartmentDto loadDto)
        {
            var updated = await _repository.UpdateLoadStatusAsync(id, loadDto.ItemDesc ?? "");
            if (updated == null)
            {
                throw new InvalidOperationException("Không tìm thấy gán ngăn chứa");
            }

            // Tạo log tự động
            var log = new Log
            {
                RobotId = updated.Compartment.RobotId,
                TaskId = updated.TaskId,
                StopId = updated.StopId,
                LogType = "success",
                Message = $"Đã nạp ngăn chứa {updated.Compartment.CompartmentCode} cho nhiệm vụ {updated.TaskId}. Hàng: {loadDto.ItemDesc ?? "Tổng quát"}",
                CreatedAt = DateTime.Now
            };
            await _logRepository.CreateAsync(log);

            return _mapper.Map<CompartmentAssignmentResponseDto>(updated);
        }

        /// <summary>
        /// Cập nhật thông tin gán ngăn chứa
        /// </summary>
        public async Task<CompartmentAssignmentResponseDto?> UpdateAsync(ulong id, CompartmentAssignmentDto assignmentDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Không tìm thấy gán ngăn chứa");
            }

            // Kiểm tra trạng thái hợp lệ
            if (!ValidStatuses.Contains(assignmentDto.Status))
            {
                throw new ArgumentException($"Trạng thái không hợp lệ: {assignmentDto.Status}. Phải là một trong: {string.Join(", ", ValidStatuses)}");
            }

            // Không cho cập nhật nếu đã loaded/delivered
            if (existing.Status == "loaded" || existing.Status == "delivered")
            {
                throw new InvalidOperationException("Không thể cập nhật gán ngăn chứa đã nạp hoặc đã giao");
            }

            // Kiểm tra nếu thay đổi Compartment/Stop/Task
            // Kiểm tra thay đổi TaskId
            ulong taskIdToValidate = assignmentDto.TaskId != existing.TaskId ? assignmentDto.TaskId : existing.TaskId;
            var task = await _taskRepository.GetByIdAsync(taskIdToValidate);
            if (task == null)
            {
                throw new InvalidOperationException("Không tìm thấy nhiệm vụ");
            }

            // Kiểm tra StopId (phải thuộc Task cần validate)
            var stop = task.TaskStops.FirstOrDefault(ts => ts.Id == assignmentDto.StopId);
            if (stop == null)
            {
                throw new InvalidOperationException("Không tìm thấy điểm dừng trong nhiệm vụ");
            }

            // Kiểm tra thay đổi CompartmentId (phải thuộc Robot của Task)
            if (assignmentDto.CompartmentId.HasValue && assignmentDto.CompartmentId != existing.CompartmentId)
            {
                var robot = await _robotRepository.GetByIdAsync(task.RobotId);
                if (robot == null)
                {
                    throw new InvalidOperationException("Không tìm thấy robot của nhiệm vụ");
                }

                var compartment = robot.RobotCompartments.FirstOrDefault(c => c.Id == assignmentDto.CompartmentId.Value);
                if (compartment == null)
                {
                    throw new InvalidOperationException("Không tìm thấy ngăn chứa trong robot");
                }
            }

            var assignment = _mapper.Map<CompartmentAssignment>(assignmentDto);
            assignment.Id = id;
            assignment.UpdatedAt = DateTime.Now;

            var updated = await _repository.UpdateAsync(id, assignment);
            return updated != null ? _mapper.Map<CompartmentAssignmentResponseDto>(updated) : null;
        }
    }
}
