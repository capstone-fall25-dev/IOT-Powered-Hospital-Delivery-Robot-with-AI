using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    /// <summary>
    /// Cấu hình mapping cho bản đồ và điểm đến
    /// </summary>
    public class MapProfile : Profile
    {
        public MapProfile()
        {
            // Tạo bản đồ
            CreateMap<MapDto, Map>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.ImageData, opt => opt.Ignore());

            // Upload bản đồ từ ROS2
            CreateMap<MapUploadDto, Map>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.ImageData, opt => opt.Ignore())
                .ForMember(dest => dest.ImageName, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

            CreateMap<Destination, DestinationDto>();

            // Bản đồ → Response DTO
            CreateMap<Map, MapResponseDto>()
                .ForMember(dest => dest.Robots, opt => opt.MapFrom(src => src.Robots))
                .ForMember(dest => dest.ImageData, opt => opt.MapFrom(src => src.ImageData))
                .ForMember(dest => dest.Destinations, opt => opt.MapFrom(src => src.Destinations))
                .ForMember(dest => dest.NameMapFE, opt => opt.MapFrom(src => src.NameMapFE));
        }
    }
}