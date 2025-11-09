using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class RobotProfile : Profile
    {
        public RobotProfile()
        {
            // ✅ Mapping cho Robot
            CreateMap<RobotDto, Robot>()
                .ForMember(dest => dest.Status, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.LastHeartbeatAt, opt => opt.Ignore());

            CreateMap<Robot, RobotResponseDto>()
                .ForMember(dest => dest.Compartments, opt => opt.MapFrom(src => src.RobotCompartments))
                .ForMember(dest => dest.Tasks, opt => opt.MapFrom(src => src.Tasks));

            // ✅ Mapping cho Robot Maintenance Log
            CreateMap<RobotMaintenanceLogDto, RobotMaintenanceLog>();
            CreateMap<RobotMaintenanceLog, RobotMaintenanceLogResponseDto>()
                .ForMember(dest => dest.RobotCode, opt => opt.MapFrom(src => src.Robot.Code));

            // ✅ Thêm dòng này để fix lỗi mapping Compartment
            CreateMap<RobotCompartment, RobotCompartmentResponseDto>();
        }
    }
}
