namespace API_Powered_Hospital_Delivery_Robot.Services.IServices
{
    public interface ITaskSchedulerService
    {
        Task<int> SchedulePendingTasksAsync();
    }
}
