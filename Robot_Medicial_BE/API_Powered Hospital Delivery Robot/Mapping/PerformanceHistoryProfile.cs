using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho lịch sử hiệu suất robot
    /// </summary>
    public class PerformanceHistoryProfile : Profile
    {
        public PerformanceHistoryProfile()
        {
            // DTO → Entity (cho Create/Update)
            CreateMap<PerformanceHistoryDto, PerformanceHistory>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.CompletionDate, opt => opt.MapFrom(src => src.CompletionDate));

            // Entity → Response DTO (cho Get)
            CreateMap<PerformanceHistory, PerformanceHistoryResponseDto>()
                .ForMember(dest => dest.RobotCode, opt => opt.MapFrom(src => src.Robot.Code));
        }
    }
}
