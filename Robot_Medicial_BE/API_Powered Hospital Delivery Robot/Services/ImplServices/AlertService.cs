using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class AlertService : IAlertService
    {
        private readonly IAlertRepository _repository;
        private readonly IMapper _mapper;
        private readonly ITaskRepository _taskRepository; 

        public AlertService(IAlertRepository repository, IMapper mapper
            , ITaskRepository taskRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _taskRepository = taskRepository;
        }

        public async Task<AlertResponseDto> CreateAsync(AlertDto alertDto)
        {
            var alert = _mapper.Map<Alert>(alertDto);
            alert.CreatedAt = DateTime.UtcNow;
            var created = await _repository.CreateAsync(alert);
            return _mapper.Map<AlertResponseDto>(created);
        }

        public async Task<AlertResponseDto> CreateMedicineAlertAsync(ulong prescriptionItemId, string reason, string description, ulong? taskId = null)
        {
           

            // Fetch robot_id from task (required since alerts.robot_id NOT NULL)
            if (!taskId.HasValue)
            {
                throw new ArgumentException("TaskId is required to fetch the associated robot");
            }

            var task = await _taskRepository.GetByIdAsync(taskId.Value);
            if (task == null)
            {
                throw new InvalidOperationException("Task not found");
            }

            if (task.RobotId == 0)
            {
                throw new InvalidOperationException("Task has no assigned robot");
            }

            // Report damaged in item
            var alert = new Alert
            {
                RobotId = task.RobotId, // Use robot from task
                Severity = "high",
                Category = "manual",
                Status = "open",
                CreatedAt = DateTime.UtcNow,
                PrescriptionItemId = prescriptionItemId // Liên kết
            };

            var created = await _repository.CreateAsync(alert);
            return _mapper.Map<AlertResponseDto>(created);
        }

        public async Task<IEnumerable<AlertResponseDto>> GetAllAsync(ulong? robotId = null, string? status = null, string? severity = null, ulong? prescriptionItemId = null)
        {
            var alerts = await _repository.GetAllAsync(robotId, status, severity, prescriptionItemId);
            return _mapper.Map<IEnumerable<AlertResponseDto>>(alerts);
        }

        public async Task<AlertResponseDto?> GetByIdAsync(ulong id)
        {
            var alert = await _repository.GetByIdAsync(id);
            return alert != null ? _mapper.Map<AlertResponseDto>(alert) : null;
        }

        public async Task<AlertResponseDto?> UpdateAsync(ulong id, AlertDto alertDto)
        {
            var alert = _mapper.Map<Alert>(alertDto);
            var updated = await _repository.UpdateAsync(id, alert);
            return updated != null ? _mapper.Map<AlertResponseDto>(updated) : null;
        }
    }
}