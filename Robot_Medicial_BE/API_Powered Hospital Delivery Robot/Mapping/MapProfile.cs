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

            // Map từ MapDto → Map (sử dụng cho Create / Update)
            CreateMap<MapDto, Map>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

            // Map từ MapUploadDto → Map (sử dụng cho ROS2 Upload)
            CreateMap<MapUploadDto, Map>()
                .ForMember(dest => dest.Id, opt => opt.Ignore())
                .ForMember(dest => dest.ImageData, opt => opt.Ignore()) // file upload xử lý riêng
                .ForMember(dest => dest.ImageName, opt => opt.Ignore())
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore());

            // Map từ Map → MapResponseDto (output)
            CreateMap<Map, MapResponseDto>()
                .ForMember(dest => dest.Robots, opt => opt.MapFrom(src => src.Robots))
                .ForMember(dest => dest.ImageData, opt => opt.MapFrom(src => src.ImageData))
                .ForMember(dest => dest.Destinasion, opt => opt.MapFrom(src => src.Destinations));
        }
    }
}
