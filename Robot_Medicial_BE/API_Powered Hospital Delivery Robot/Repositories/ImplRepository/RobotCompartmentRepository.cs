using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using Microsoft.EntityFrameworkCore;

namespace API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository
{
    public class RobotCompartmentRepository : IRobotCompartmentRepository
    {
        private readonly RobotManagerContext _context;

        public RobotCompartmentRepository(RobotManagerContext context)
        {
            _context = context;
        }

        public async Task<RobotCompartment?> GetByIdAsync(ulong id)
        {
            return await _context.RobotCompartments.FirstOrDefaultAsync(c => c.Id == id);
        }

        // UC 38: Update status 'locked'/'unlocked'
        public async Task<RobotCompartment?> UpdateStatusAsync(ulong id, string status)
        {
            if (!new[] { "locked", "unlocked" }.Contains(status))
                throw new ArgumentException("Invalid status: must be 'locked' or 'unlocked'");

            var compartment = await _context.RobotCompartments.FindAsync(id);
            if (compartment == null)
                throw new InvalidOperationException("Compartment not found");

            compartment.Status = status;
            await _context.SaveChangesAsync();
            return compartment;
        }

        public async Task<IEnumerable<RobotCompartment>> GetByCategoryAndRobotAsync(ulong categoryId, ulong robotId)
        {
            return await _context.RobotCompartments
                .Include(rc => rc.Robot)
                .Include(rc => rc.Category)
                .Include(rc => rc.Patient)
                .Where(rc => rc.CategoryId == categoryId && rc.RobotId == robotId && rc.IsActive == true)
                .ToListAsync();
        }

        public async Task<IEnumerable<RobotCompartment>> GetByRobotAsync(ulong robotId)
        {
            return await _context.RobotCompartments
                .Include(rc => rc.Category)
                .Include(rc => rc.Patient)
                .Where(rc => rc.RobotId == robotId && rc.IsActive == true)
                .ToListAsync();
        }

        public async System.Threading.Tasks.Task AssignPatientToCompartment(ulong compartmentId, ulong patientId)
        {
            var comp = await _context.RobotCompartments.FindAsync(compartmentId);
            if (comp == null)
                throw new InvalidOperationException("Compartment not found");

            comp.PatientId = patientId; // Gán bệnh nhân
            comp.Status = "locked";     // Khoang đang chứa thuốc

            await _context.SaveChangesAsync();
        }

        public async Task<bool> AssignCategoryToCompartment(ulong compId, ulong categoryId)
        {
            var comp = await _context.RobotCompartments.FindAsync(compId);
            if (comp == null) return false;

            comp.CategoryId = categoryId;
            await _context.SaveChangesAsync();
            return true;
        }
    }
}