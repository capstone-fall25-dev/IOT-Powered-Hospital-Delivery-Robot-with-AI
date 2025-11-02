using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class MapProfile : Profile
    {
        public MapProfile()
        {
            CreateMap<MapDto, Map>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

            CreateMap<Map, MapResponseDto>()
                .ForMember(dest => dest.Robots, opt => opt.MapFrom(src => src.Robots))
                .ForMember(dest => dest.ImageData, opt => opt.MapFrom(src => src.ImageData));
        }
    }
}
