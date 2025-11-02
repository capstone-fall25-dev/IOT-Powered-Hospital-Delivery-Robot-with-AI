using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskSchedulerService : ITaskSchedulerService
    {
        private readonly ITaskService _taskService;
        private readonly ILogService _logService;

        public TaskSchedulerService(ITaskService taskService, ILogService logService)
        {
            _taskService = taskService;
            _logService = logService;
        }

        // Auto-assign pending tasks to available robots (prioritize Critical/Urgent) - UC 33: Task Scheduling (Task Management)
        public async Task<int> SchedulePendingTasksAsync()
        {
            var count = await _taskService.SchedulePendingTasksAsync();
            await _logService.CreateAsync(new LogDto
            {
                RobotId = 0, // System log
                TaskId = null,
                LogType = "info",
                Message = $"Scheduler assigned {count} pending tasks at {DateTime.UtcNow}"
            });
            return count;
        }
    }
}
