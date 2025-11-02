using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class RobotProfile : Profile
    {
        public RobotProfile()
        {
            CreateMap<RobotDto, Robot>()
                .ForMember(dest => dest.Status, opt => opt.Ignore()) // Set in service
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.LastHeartbeatAt, opt => opt.Ignore()) //;
                .ForMember(dest => dest.RobotCompartments, opt => opt.Ignore());

            CreateMap<Robot, RobotResponseDto>();
                //.ForMember(dest => dest.Compartments, opt => opt.MapFrom(src => src.RobotCompartments));
        }
    }
}
