using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Quartz;

namespace API_Powered_Hospital_Delivery_Robot.Helpers
{
    public class TaskSchedulerJob : IJob
    {
        private readonly IServiceProvider _serviceProvider;

        public TaskSchedulerJob(IServiceProvider serviceProvider)
        {
            _serviceProvider = serviceProvider;
        }

        public async Task Execute(IJobExecutionContext context)
        {
            using var scope = _serviceProvider.CreateScope();
            var schedulerService = scope.ServiceProvider.GetRequiredService<ITaskSchedulerService>();
            await schedulerService.SchedulePendingTasksAsync();
        }
    }
}
