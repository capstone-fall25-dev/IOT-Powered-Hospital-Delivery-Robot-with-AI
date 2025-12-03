using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.SignalR;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class TaskSchedulerService : BackgroundService
    {
        private readonly IServiceProvider _services;
        private readonly IHubContext<TaskHub> _taskHub;

        public TaskSchedulerService(IServiceProvider services, IHubContext<TaskHub> taskHub)
        {
            _services = services;
            _taskHub = taskHub;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using var scope = _services.CreateScope();
                var taskService = scope.ServiceProvider.GetRequiredService<ITaskService>();

                await taskService.CancelOverduePendingTasksAsync();

                // Kiểm tra mỗi 30 giây (tùy chỉnh được)
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }
}
