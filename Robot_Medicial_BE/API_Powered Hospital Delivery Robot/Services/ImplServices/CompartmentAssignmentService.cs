using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class CompartmentAssignmentService : ICompartmentAssignmentService
    {
        private readonly ICompartmentAssignmentRepository _repository;
        private readonly IMapper _mapper;
        private readonly ITaskRepository _taskRepository;
        private readonly IRobotRepository _robotRepository;
        private readonly ILogRepository _logRepository;

        // Enum statuses cho validate
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

        public async Task<IEnumerable<CompartmentAssignmentResponseDto>> BulkLoadForTaskAsync(ulong taskId, List<LoadCompartmentDto> loadDtos)
        {
            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null || task.Status != "pending")
            {
                throw new InvalidOperationException("Task must be pending");
            }

            var assignments = await _repository.GetAllAsync(taskId: taskId, status: "pending");
            if (assignments.Count() != loadDtos.Count)
            {
                throw new ArgumentException("Load DTOs must match pending assignments");
            }

            var loadedAssignments = new List<CompartmentAssignmentResponseDto>();
            for (int i = 0; i < assignments.Count(); i++)
            {
                var assignment = assignments.ElementAt(i);
                var loadDto = loadDtos[i];
                var loaded = await LoadAsync(assignment.Id, loadDto); // Reuse single load
                if (loaded != null) loadedAssignments.Add(loaded);
            }

            // Log bulk
            var bulkLog = new Log
            {
                RobotId = task.RobotId,
                TaskId = taskId,
                LogType = "info",
                Message = $"Bulk loaded {loadedAssignments.Count} compartments for task {taskId}",
                CreatedAt = DateTime.UtcNow
            };
            await _logRepository.CreateAsync(bulkLog);

            return loadedAssignments;
        }

        public async Task<CompartmentAssignmentResponseDto> CreateAsync(CompartmentAssignmentDto assignmentDto)
        {
            // Validate Task và Stop tồn tại
            var task = await _taskRepository.GetByIdAsync(assignmentDto.TaskId);
            if (task == null)
            {
                throw new InvalidOperationException("Task not found");
            }

            var stop = task.TaskStops.FirstOrDefault(ts => ts.Id == assignmentDto.StopId);
            if (stop == null)
            {
                throw new InvalidOperationException("Stop not found in task");
            }

            // Validate Compartment (thuộc robot của task)
            if (assignmentDto.CompartmentId.HasValue)
            {
                var robot = await _robotRepository.GetByIdAsync(task.RobotId);
                var compartment = robot?.RobotCompartments.FirstOrDefault(c => c.Id == assignmentDto.CompartmentId.Value);
                if (compartment == null)
                {
                    throw new InvalidOperationException("Compartment not found in robot");
                }
            }

            var assignment = _mapper.Map<CompartmentAssignment>(assignmentDto);
            assignment.CreatedAt = DateTime.UtcNow;
            assignment.UpdatedAt = DateTime.UtcNow;

            var created = await _repository.CreateAsync(assignment);
            return _mapper.Map<CompartmentAssignmentResponseDto>(created);
        }

        public async Task<IEnumerable<CompartmentAssignmentResponseDto>> GetAllAsync(ulong? taskId = null, string? status = null)
        {
            var assignments = await _repository.GetAllAsync(taskId, status);
            return _mapper.Map<IEnumerable<CompartmentAssignmentResponseDto>>(assignments);
        }

        public async Task<CompartmentAssignmentResponseDto?> GetByIdAsync(ulong id)
        {
            var assignment = await _repository.GetByIdAsync(id);
            return assignment != null ? _mapper.Map<CompartmentAssignmentResponseDto>(assignment) : null;
        }

        public async Task<CompartmentAssignmentResponseDto?> LoadAsync(ulong id, LoadCompartmentDto loadDto)
        {
            var updated = await _repository.UpdateLoadStatusAsync(id, loadDto.ItemDesc);
            if (updated == null)
            {
                throw new InvalidOperationException("Assignment not found");
            }

            // Tạo Log tự động
            var log = new Log
            {
                RobotId = updated.Compartment.RobotId,
                TaskId = updated.TaskId,
                StopId = updated.StopId,
                LogType = "success",
                Message = $"Compartment {updated.Compartment.CompartmentCode} loaded for task {updated.TaskId}. Item: {loadDto.ItemDesc ?? "General"}",
                CreatedAt = DateTime.UtcNow
            };
            await _logRepository.CreateAsync(log);

            return _mapper.Map<CompartmentAssignmentResponseDto>(updated);
        }

        public async Task<CompartmentAssignmentResponseDto?> UpdateAsync(ulong id, CompartmentAssignmentDto assignmentDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("Assignment not found");
            }

            // Validate status enum
            if (!ValidStatuses.Contains(assignmentDto.Status))
            {
                throw new ArgumentException($"Invalid status: {assignmentDto.Status}. Must be one of: {string.Join(", ", ValidStatuses)}");
            }

            // Không cho update nếu đã loaded/delivered
            if (existing.Status == "loaded" || existing.Status == "delivered")
            {
                throw new InvalidOperationException("Cannot update loaded or delivered assignment");
            }

            // Validate nếu thay đổi Compartment/Stop/Task
            // Kiểm tra thay đổi TaskId
            ulong taskIdToValidate = assignmentDto.TaskId != existing.TaskId ? assignmentDto.TaskId : existing.TaskId;
            var task = await _taskRepository.GetByIdAsync(taskIdToValidate);
            if (task == null)
            {
                throw new InvalidOperationException("Task not found");
            }

            // Kiểm tra StopId (phải thuộc Task cần validate)
            var stop = task.TaskStops.FirstOrDefault(ts => ts.Id == assignmentDto.StopId);
            if (stop == null)
            {
                throw new InvalidOperationException("Stop not found in task");
            }

            // Kiểm tra thay đổi CompartmentId (phải thuộc Robot của Task)
            if (assignmentDto.CompartmentId.HasValue && assignmentDto.CompartmentId != existing.CompartmentId)
            {
                var robot = await _robotRepository.GetByIdAsync(task.RobotId);
                if (robot == null)
                {
                    throw new InvalidOperationException("Robot of task not found");
                }

                var compartment = robot.RobotCompartments.FirstOrDefault(c => c.Id == assignmentDto.CompartmentId.Value);
                if (compartment == null)
                {
                    throw new InvalidOperationException("Compartment not found in robot");
                }
            }

            var assignment = _mapper.Map<CompartmentAssignment>(assignmentDto);
            assignment.Id = id;
            assignment.UpdatedAt = DateTime.UtcNow;

            var updated = await _repository.UpdateAsync(id, assignment);
            return updated != null ? _mapper.Map<CompartmentAssignmentResponseDto>(updated) : null;
        }
    }
}
