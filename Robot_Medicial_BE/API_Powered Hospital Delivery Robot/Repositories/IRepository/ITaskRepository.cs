namespace API_Powered_Hospital_Delivery_Robot.Repositories.IRepository
{
    public interface ITaskRepository
    {
        Task<IEnumerable<Models.Entities.Task>> GetAllAsync();
        Task<Models.Entities.Task?> GetByIdAsync(ulong id);
        Task<IEnumerable<Models.Entities.Task>> GetByAssignedByAsync(ulong assignedById); 
        Task<Models.Entities.Task> CreateAsync(Models.Entities.Task task);
        Task<Models.Entities.Task?> UpdateAsync(ulong id, Models.Entities.Task task);
        Task<bool> CancelAsync(ulong id);
    }
}
