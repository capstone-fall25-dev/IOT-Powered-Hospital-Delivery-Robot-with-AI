using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class MapProfile : Profile
    {
        public MapProfile()
        {
            // Map từ MapDto → Map (Create: map đầy đủ, bao gồm MapName)
            CreateMap<MapDto, Map>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())  // Ignore chỉ CreatedAt
                .ForMember(dest => dest.ImageData, opt => opt.Ignore());  // Ignore ImageData (set manual từ file)

            // Cho Update, chúng ta dùng _mapper.Map(dto, existing) - sẽ map chỉ các trường khớp, giữ MapName cũ

            // Map từ MapUploadDto → Map (ROS2 Upload)
            CreateMap<MapUploadDto, Map>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.ImageData, opt => opt.Ignore())
                .ForMember(dest => dest.ImageName, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

            // Map từ Destination → DestinationDto
            CreateMap<Destination, DestinationDto>();

            // Map từ Map → MapResponseDto
            CreateMap<Map, MapResponseDto>()
                .ForMember(dest => dest.Robots, opt => opt.MapFrom(src => src.Robots))
                .ForMember(dest => dest.ImageData, opt => opt.MapFrom(src => src.ImageData))
                .ForMember(dest => dest.Destinations, opt => opt.MapFrom(src => src.Destinations))
                .ForMember(dest => dest.NameMapFE, opt => opt.MapFrom(src => src.NameMapFE));
        }
    }
}