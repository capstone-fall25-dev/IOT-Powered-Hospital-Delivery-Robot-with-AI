using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mappings
{
    public class UserMappingProfile : Profile
    {
        public UserMappingProfile()
        {
            // DTO → Entity
            CreateMap<RegisterRequest, User>()
                .ForMember(dest => dest.PasswordHash, opt => opt.Ignore()) // Hash sẽ được xử lý trong service
                .ForMember(dest => dest.CreatedAt, opt => opt.MapFrom(_ => DateTime.Now))
                .ForMember(dest => dest.UpdatedAt, opt => opt.MapFrom(_ => DateTime.Now))
                .ForMember(dest => dest.IsActive, opt => opt.MapFrom(_ => false))
                .ForMember(dest => dest.Role, opt => opt.MapFrom(_ => "operator"))
                .ForMember(dest => dest.FullName, opt => opt.MapFrom(src => src.FullName ?? "Cô y tá xinh đẹp"));

            // Entity → DTO (nếu bạn cần trả thông tin user ra ngoài)
            CreateMap<User, RegisterRequest>();
        }
    }
}
