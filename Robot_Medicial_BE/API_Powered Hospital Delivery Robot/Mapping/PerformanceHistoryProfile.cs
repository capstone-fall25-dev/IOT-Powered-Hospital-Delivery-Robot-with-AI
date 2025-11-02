using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class PerformanceHistoryProfile : Profile
    {
        public PerformanceHistoryProfile()
        {
            // Mapping từ DTO sang Entity (cho Create/Update)
            CreateMap<PerformanceHistoryDto, PerformanceHistory>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore()) 
                .ForMember(dest => dest.CompletionDate, opt => opt.MapFrom(src => src.CompletionDate)); 

            // Mapping từ Entity sang Response DTO (cho Get)
            CreateMap<PerformanceHistory, PerformanceHistoryResponseDto>()
                .ForMember(dest => dest.RobotCode, opt => opt.MapFrom(src => src.Robot.Code)); // Map từ relation Robot
        }
    }
}
