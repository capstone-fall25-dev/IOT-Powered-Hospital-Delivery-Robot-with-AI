using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho điểm đến
    /// </summary>
    public class DestinationProfile : Profile
    {
        public DestinationProfile()
        {
            CreateMap<DestinationDto, Destination>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.TaskStops, opt => opt.Ignore());

            CreateMap<Destination, DestinationResponseDto>()
                .ForMember(dest => dest.TaskCount, opt => opt.MapFrom(src => src.TaskStops.Count));
        }
    }
}
