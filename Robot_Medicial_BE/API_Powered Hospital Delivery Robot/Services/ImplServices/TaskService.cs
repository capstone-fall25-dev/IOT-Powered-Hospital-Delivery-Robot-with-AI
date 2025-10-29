using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskService : ITaskService
    {
        private readonly ITaskRepository _repository;
        private readonly IMapper _mapper;
        private readonly IUserRepository _userRepository;
        private readonly IRobotRepository _robotRepository;

        // Enum status cho validate
        private readonly string[] ValidStatuses = { "pending", "in_progress", "awaiting_handover", "returning", "at_station", "completed", "canceled" };

        public TaskService(ITaskRepository repository, IMapper mapper, IUserRepository userRepository, IRobotRepository robotRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _userRepository = userRepository;
            _robotRepository = robotRepository;
        }

        public async Task<TaskResponseDto> CreateAsync(TaskDto taskDto)
        {
            if (!string.IsNullOrEmpty(taskDto.Status) && !ValidStatuses.Contains(taskDto.Status))
            {
                throw new ArgumentException($"Trạng thái: {taskDto.Status} không hợp lệ. Phải là một trong các trạng thái sau: {string.Join(", ", ValidStatuses)}");
            }

            var robot = await _robotRepository.GetByIdAsync(taskDto.RobotId);
            if (robot == null)
            {
                throw new InvalidOperationException("Không tìm thấy robot");
            }

            if (taskDto.AssignedBy.HasValue)
            {
                var user = await _userRepository.GetByIdAsync(taskDto.AssignedBy.Value);
                if (user == null)
                {
                    throw new InvalidOperationException("Không tìm thấy user đã assign");
                }
            }

            var task = _mapper.Map<Models.Entities.Task>(taskDto);
            task.Status = string.IsNullOrEmpty(taskDto.Status) ? "pending" : taskDto.Status;
            task.CreatedAt = DateTime.Now;
            task.UpdatedAt = DateTime.Now;
            task.TotalErrors = 0;

            var created = await _repository.CreateAsync(task);
            return _mapper.Map<TaskResponseDto>(created);
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
                throw new InvalidOperationException("Không thể hủy nhiệm vụ đã hoàn thành");
            }
            return await _repository.CancelAsync(id);
        }

        public async Task<IEnumerable<TaskResponseDto>> GetAllAsync()
        {
            var tasks = await _repository.GetAllAsync();
            return _mapper.Map<IEnumerable<TaskResponseDto>>(tasks);
        }

        public async Task<IEnumerable<TaskResponseDto>> GetByAssignedByAsync(ulong assignedById)
        {
            var user = await _userRepository.GetByIdAsync(assignedById);
            if (user == null)
            {
                throw new InvalidOperationException("Không tìm thấy user");
            }

            var tasks = await _repository.GetByAssignedByAsync(assignedById);
            return _mapper.Map<IEnumerable<TaskResponseDto>>(tasks);
        }

        public async Task<TaskResponseDto?> GetByIdAsync(ulong id)
        {
            var task = await _repository.GetByIdAsync(id);

            if (task != null)
            {
                return _mapper.Map<TaskResponseDto>(task);
            }
            return null;
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
                throw new InvalidOperationException("Không tìm thấy nhiệm vụ");
            }

            if (existing.Status == "completed" || existing.Status == "canceled")
            {
                throw new InvalidOperationException("Không update nhiệm vụ nếu đã hoàn thành hoặc bị hủy");
            }

            // Validate robot nếu thay đổi
            var robot = await _robotRepository.GetByIdAsync(taskDto.RobotId);
            if (robot == null)
            {
                throw new InvalidOperationException("Không tìm thấy robot");
            }

            // Validate user nếu thay đổi người giao task
            if (taskDto.AssignedBy.HasValue)
            {
                var user = await _userRepository.GetByIdAsync(taskDto.AssignedBy.Value);
                if (user == null)
                {
                    throw new InvalidOperationException("Không tìm thấy user đã assign");
                }
            }

            var task = _mapper.Map<Models.Entities.Task>(taskDto);
            task.Id = id;
            task.UpdatedAt = DateTime.Now;

            var updated = await _repository.UpdateAsync(id, task);
            if (updated != null)
            {
                return _mapper.Map<TaskResponseDto>(updated);
            }
            return null;
        }
    }
}
