using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    /// <summary>
    /// Quản lý ngăn chứa của robot
    /// </summary>
    public class RobotCompartmentService : IRobotCompartmentService
    {
        private readonly IRobotCompartmentRepository _repository;
        private readonly IMapper _mapper;
        private readonly ILogRepository _logRepository;

        public RobotCompartmentService(IRobotCompartmentRepository repository, IMapper mapper, ILogRepository logRepository)
        {
            _repository = repository;
            _mapper = mapper;
            _logRepository = logRepository;
        }

        /// <summary>
        /// Lấy ngăn chứa theo ID
        /// </summary>
        public async Task<RobotCompartmentResponseDto?> GetByIdAsync(ulong id)
        {
            var compartment = await _repository.GetByIdAsync(id);
            return compartment != null ? _mapper.Map<RobotCompartmentResponseDto>(compartment) : null;
        }

        /// <summary>
        /// Mở ngăn chứa (cập nhật trạng thái "unlocked")
        /// </summary>
        public async Task<RobotCompartmentResponseDto?> OpenCompartmentAsync(ulong id)
        {
            var compartment = await _repository.GetByIdAsync(id);
            if (compartment == null) return null;
            
            var updated = await _repository.UpdateStatusAsync(id, "unlocked");
            
            if (updated != null)
            {
                // Log compartment opened
                await _logRepository.CreateAsync(new Log
                {
                    RobotId = updated.RobotId,
                    LogType = "info",
                    Message = $"Ngăn chứa {updated.CompartmentCode} đã được mở (Robot ID: {updated.RobotId})",
                    CreatedAt = DateTimeHelper.Now()
                });
            }
            
            return updated != null ? _mapper.Map<RobotCompartmentResponseDto>(updated) : null;
        }

        /// <summary>
        /// Đóng ngăn chứa (cập nhật trạng thái "locked")
        /// </summary>
        public async Task<RobotCompartmentResponseDto?> CloseCompartmentAsync(ulong id)
        {
            var compartment = await _repository.GetByIdAsync(id);
            if (compartment == null) return null;
            
            var updated = await _repository.UpdateStatusAsync(id, "locked");
            
            if (updated != null)
            {
                // Log compartment closed
                await _logRepository.CreateAsync(new Log
                {
                    RobotId = updated.RobotId,
                    LogType = "info",
                    Message = $"Ngăn chứa {updated.CompartmentCode} đã được khóa (Robot ID: {updated.RobotId})",
                    CreatedAt = DateTimeHelper.Now()
                });
            }
            
            return updated != null ? _mapper.Map<RobotCompartmentResponseDto>(updated) : null;
        }

        /// <summary>
        /// Lấy ngăn chứa theo danh mục và robot
        /// </summary>
        public async Task<IEnumerable<RobotCompartmentResponseDto>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId)
        {
            var compartments = await _repository.GetByCategoryAndRobotAsync(categoryId, robotId);
            return _mapper.Map<IEnumerable<RobotCompartmentResponseDto>>(compartments);
        }

        /// <summary>
        /// Lấy tất cả ngăn chứa theo robot
        /// </summary>
        public async Task<IEnumerable<RobotCompartmentResponseDto>> GetByRobotAsync(ulong robotId)
        {
            var data = await _repository.GetByRobotAsync(robotId);
            return _mapper.Map<IEnumerable<RobotCompartmentResponseDto>>(data);
        }

        /// <summary>
        /// Lấy ngăn chứa đã lọc theo robot (chỉ lấy unlocked và không busy)
        /// </summary>
        public async Task<IEnumerable<RobotCompartmentResponseDto>> GetFilteredByRobotAsync(ulong robotId, ulong? categoryId)
        {
            var data = await _repository.GetFilteredByRobotAsync(robotId, categoryId);
            return _mapper.Map<IEnumerable<RobotCompartmentResponseDto>>(data);
        }
    }
}