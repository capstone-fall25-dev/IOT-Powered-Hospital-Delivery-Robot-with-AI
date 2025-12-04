using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý cảnh báo hệ thống
    /// </summary>
    public class AlertService : IAlertService
    {
        private readonly IAlertRepository _repository;
        private readonly IMapper _mapper;
        private readonly IPrescriptionItemRepository _itemRepository;
        private readonly IMedicineRepository _medicineRepository;
        private readonly ITaskRepository _taskRepository;
        private readonly IHubContext<AlertHub> _alertHub;

        public AlertService(IAlertRepository repository, 
            IMapper mapper, 
            IPrescriptionItemRepository itemRepository, 
            IMedicineRepository medicineRepository, 
            ITaskRepository taskRepository,
            IHubContext<AlertHub> alertHub)
        {
            _repository = repository;
            _mapper = mapper;
            _itemRepository = itemRepository;
            _medicineRepository = medicineRepository;
            _taskRepository = taskRepository;
            _alertHub = alertHub;
        }

        /// <summary>
        /// Tạo cảnh báo mới
        /// </summary>
        public async Task<AlertResponseDto> CreateAsync(AlertDto alertDto)
        {
            var alert = _mapper.Map<Alert>(alertDto);
            alert.CreatedAt = DateTime.Now;
            var created = await _repository.CreateAsync(alert);
            var response = _mapper.Map<AlertResponseDto>(created);

            // Gửi cảnh báo real-time qua SignalR
            await _alertHub.Clients.All.SendAsync("ReceiveAlert", response);

            return response;
        }

        /// <summary>
        /// Tạo cảnh báo liên quan đến thuốc (hư hỏng, thiếu, v.v.)
        /// </summary>
        public async Task<AlertResponseDto> CreateMedicineAlertAsync(ulong prescriptionItemId, string reason, string description, ulong? taskId = null)
        {
            var item = await _itemRepository.GetByIdAsync(prescriptionItemId);
            if (item == null)
            {
                throw new InvalidOperationException("Không tìm thấy chi tiết đơn thuốc");
            }

            var medicine = await _medicineRepository.GetByIdAsync(item.MedicineId);
            if (medicine == null)
            {
                throw new InvalidOperationException("Không tìm thấy thuốc");
            }

            // Lấy robot_id từ task (bắt buộc vì alerts.robot_id NOT NULL)
            if (!taskId.HasValue)
            {
                throw new ArgumentException("TaskId là bắt buộc để lấy robot liên quan");
            }

            var task = await _taskRepository.GetByIdAsync(taskId.Value);
            if (task == null)
            {
                throw new InvalidOperationException("Không tìm thấy nhiệm vụ");
            }

            if (task.RobotId == 0)
            {
                throw new InvalidOperationException("Nhiệm vụ chưa được gán robot");
            }

            // Tạo cảnh báo hư hỏng/thất lạc thuốc
            var alert = new Alert
            {
                RobotId = task.RobotId,
                Severity = "high",
                Category = "manual",
                Status = "open",
                Message = $"Thuốc '{medicine.Name}' trong chi tiết đơn {prescriptionItemId} bị {reason}: {description}. Đã cập nhật tồn kho.",
                CreatedAt = DateTime.Now,
                PrescriptionItemId = prescriptionItemId
            };

            var created = await _repository.CreateAsync(alert);
            var response = _mapper.Map<AlertResponseDto>(created);

            // Gửi cảnh báo real-time qua SignalR
            await _alertHub.Clients.All.SendAsync("ReceiveAlert", response);

            return response;
        }

        /// <summary>
        /// Lấy danh sách cảnh báo (có thể lọc theo robot, trạng thái, mức độ, chi tiết đơn thuốc)
        /// </summary>
        public async Task<IEnumerable<AlertResponseDto>> GetAllAsync(ulong? robotId = null, string? status = null, string? severity = null, ulong? prescriptionItemId = null)
        {
            var alerts = await _repository.GetAllAsync(robotId, status, severity, prescriptionItemId);
            return _mapper.Map<IEnumerable<AlertResponseDto>>(alerts);
        }

        /// <summary>
        /// Lấy chi tiết cảnh báo theo ID
        /// </summary>
        public async Task<AlertResponseDto?> GetByIdAsync(ulong id)
        {
            var alert = await _repository.GetByIdAsync(id);
            return alert != null ? _mapper.Map<AlertResponseDto>(alert) : null;
        }

        /// <summary>
        /// Cập nhật thông tin cảnh báo
        /// </summary>
        public async Task<AlertResponseDto?> UpdateAsync(ulong id, AlertDto alertDto)
        {
            var alert = _mapper.Map<Alert>(alertDto);
            var updated = await _repository.UpdateAsync(id, alert);
            return updated != null ? _mapper.Map<AlertResponseDto>(updated) : null;
        }
    }
}