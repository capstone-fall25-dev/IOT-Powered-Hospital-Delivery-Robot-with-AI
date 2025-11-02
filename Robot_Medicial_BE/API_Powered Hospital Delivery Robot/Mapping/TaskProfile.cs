using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
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
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority.ToString()));

            CreateMap<Models.Entities.Task, TaskResponseDto>()
                .ForMember(dest => dest.RobotName, opt => opt.MapFrom(src => src.Robot.Name))
                .ForMember(dest => dest.AssignedByUsername, opt => opt.MapFrom(src => src.AssignedByNavigation != null ? src.AssignedByNavigation.Email : null)) // Sử dụng Email thay Username
                .ForMember(dest => dest.Stops, opt => opt.MapFrom(src => src.TaskStops))
                .ForMember(dest => dest.SuggestedCompartments, opt => opt.Ignore()) // Set thủ công trong Service, không map từ entity
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => Enum.Parse<TaskPriority>(src.Priority, true)))
                .ForMember(dest => dest.ScheduledStartAt, opt => opt.MapFrom(src => src.ScheduledStartAt)); 

            CreateMap<TaskStop, TaskStopDto>();

            CreateMap<TaskPriorityDto, Models.Entities.Task>()
                .ForMember(dest => dest.Priority, opt => opt.MapFrom(src => src.Priority));

            CreateMap<CreateTaskDto, Models.Entities.Task>()
                .ForMember(dest => dest.ScheduledStartAt, opt => opt.MapFrom(src => src.ScheduledStartAt)); 
        }
    }
}
