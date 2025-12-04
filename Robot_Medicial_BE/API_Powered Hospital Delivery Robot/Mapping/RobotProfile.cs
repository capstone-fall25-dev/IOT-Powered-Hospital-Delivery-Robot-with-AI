using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;
namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho robot và ngăn chứa
    /// </summary>
    public class RobotProfile : Profile
    {
        public RobotProfile()
        {
            // Mapping robot
            CreateMap<RobotDto, Robot>()
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.LastHeartbeatAt, opt => opt.Ignore());
            CreateMap<Robot, RobotResponseDto>()
                .ForMember(dest => dest.Compartments, opt => opt.MapFrom(src => src.RobotCompartments))
                .ForMember(dest => dest.Tasks, opt => opt.MapFrom(src => src.Tasks));

            // Mapping nhật ký bảo trì robot
            CreateMap<RobotMaintenanceLogDto, RobotMaintenanceLog>();
            CreateMap<RobotMaintenanceLog, RobotMaintenanceLogResponseDto>()
                .ForMember(dest => dest.RobotCode, opt => opt.MapFrom(src => src.Robot.Code));

            // Mapping ngăn chứa
            CreateMap<RobotCompartment, CompartmentDto>()
                .ForMember(dest => dest.Code, opt => opt.MapFrom(src => src.CompartmentCode))
                .ForMember(dest => dest.CategoryId, opt => opt.MapFrom(src => src.CategoryId));
            CreateMap<RobotCompartment, RobotCompartmentResponseDto>();
        }
    }
}