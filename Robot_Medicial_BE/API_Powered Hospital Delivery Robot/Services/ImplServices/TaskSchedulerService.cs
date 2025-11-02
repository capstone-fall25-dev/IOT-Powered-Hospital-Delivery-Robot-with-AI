using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskSchedulerService : ITaskSchedulerService
    {
        private readonly ITaskService _taskService;

        public TaskSchedulerService(ITaskService taskService)
        {
            _taskService = taskService;
        }

        // Auto-assign pending tasks to available robots (prioritize Critical/Urgent) - UC 33: Task Scheduling (Task Management)
        public async Task<int> SchedulePendingTasksAsync()
        {
            var count = await _taskService.SchedulePendingTasksAsync();
        
            return count;
        }
    }
}
