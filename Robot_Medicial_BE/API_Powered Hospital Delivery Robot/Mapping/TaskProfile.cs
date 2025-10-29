using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Mapping
{
    public class TaskProfile : Profile
    {
        public TaskProfile()
        {
            CreateMap<TaskDto, Models.Entities.Task>()
                .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
                .ForMember(dest => dest.TotalErrors, opt => opt.Ignore())
                .ForMember(dest => dest.Robot, opt => opt.Ignore())
                .ForMember(dest => dest.AssignedByNavigation, opt => opt.Ignore())
                .ForMember(dest => dest.CompartmentAssignments, opt => opt.Ignore())
                .ForMember(dest => dest.Logs, opt => opt.Ignore())
                .ForMember(dest => dest.TaskStops, opt => opt.Ignore());

            CreateMap<Models.Entities.Task, TaskResponseDto>()
                .ForMember(dest => dest.RobotName, opt => opt.MapFrom(src => src.Robot.Name))
                .ForMember(dest => dest.AssignedByUsername, opt => opt.MapFrom(src => src.AssignedByNavigation != null ? src.AssignedByNavigation.Username : null));
        }
    }
}
