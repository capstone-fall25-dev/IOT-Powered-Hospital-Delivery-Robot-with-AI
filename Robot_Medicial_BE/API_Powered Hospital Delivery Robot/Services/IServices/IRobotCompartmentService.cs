using API_Powered_Hospital_Delivery_Robot.Models.DTOs;

namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface IRobotCompartmentService
    {
        Task<RobotCompartmentResponseDto?> OpenCompartmentAsync(ulong id); // UC 38: Open
        Task<RobotCompartmentResponseDto?> CloseCompartmentAsync(ulong id); // UC 38: Close
        Task<IEnumerable<RobotCompartmentResponseDto>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId);
        Task<IEnumerable<RobotCompartmentResponseDto>> GetByRobotAsync(ulong robotId);
    }
}