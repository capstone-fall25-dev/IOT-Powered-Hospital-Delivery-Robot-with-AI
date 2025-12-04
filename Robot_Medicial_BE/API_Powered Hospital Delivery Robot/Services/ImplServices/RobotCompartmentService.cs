using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
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

        public RobotCompartmentService(IRobotCompartmentRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        /// <summary>
        /// Mở ngăn chứa (cập nhật trạng thái "unlocked")
        /// </summary>
        public async Task<RobotCompartmentResponseDto?> OpenCompartmentAsync(ulong id)
        {
            var updated = await _repository.UpdateStatusAsync(id, "unlocked");
            return updated != null ? _mapper.Map<RobotCompartmentResponseDto>(updated) : null;
        }

        /// <summary>
        /// Đóng ngăn chứa (cập nhật trạng thái "locked")
        /// </summary>
        public async Task<RobotCompartmentResponseDto?> CloseCompartmentAsync(ulong id)
        {
            var updated = await _repository.UpdateStatusAsync(id, "locked");
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