using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class DestinationProfile : Profile
    {
        public DestinationProfile()
        {
            CreateMap<DestinationDto, Destination>().ForMember(dest => dest.CreatedAt, opt => opt.Ignore());
            CreateMap<Destination, DestinationResponseDto>();
        }
    }
}
