using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class PrescriptionService : IPrescriptionService
    {
        private readonly IPrescriptionRepository _repository;
        private readonly IPrescriptionItemRepository _itemRepository;
        private readonly IMapper _mapper;
        private readonly IPatientRepository _patientRepository;
        private readonly IUserRepository _userRepository;
        private readonly IMedicineRepository _medicineRepository;
        private readonly ITaskRepository _taskRepository;
        private readonly ICompartmentAssignmentRepository _compartmentAssignmentRepository;

        public PrescriptionService(IPrescriptionRepository repository, IPrescriptionItemRepository itemRepository, IMapper mapper, 
            IPatientRepository patientRepository, IUserRepository userRepository, IMedicineRepository medicineRepository, ITaskRepository taskRepository, ICompartmentAssignmentRepository compartmentAssignmentRepository)
        {
            _repository = repository;
            _itemRepository = itemRepository;
            _mapper = mapper;
            _patientRepository = patientRepository;
            _userRepository = userRepository;
            _medicineRepository = medicineRepository;
            _taskRepository = taskRepository;
            _compartmentAssignmentRepository = compartmentAssignmentRepository;
        }

        public async Task<PrescriptionItemResponseDto> AddItemAsync(ulong prescriptionId, PrescriptionItemDto itemDto)
        {
            var prescription = await _repository.GetByIdAsync(prescriptionId);
            if (prescription == null)
            {
                throw new InvalidOperationException("Prescription not found");
            }

            var medicine = await _medicineRepository.GetByIdAsync(itemDto.MedicineId);
            if (medicine == null)
            {
                throw new InvalidOperationException("Medicine not found");
            }

            if (medicine.StockQuantity < itemDto.Quantity)
            {
                throw new InvalidOperationException("Insufficient stock");
            }

            var item = _mapper.Map<PrescriptionItem>(itemDto);
            item.PrescriptionId = prescriptionId;

            var created = await _itemRepository.CreateAsync(item);
            return _mapper.Map<PrescriptionItemResponseDto>(created);
        }

        public async Task<AssignPrescriptionResponseDto> AssignToTaskAsync(ulong prescriptionId, ulong taskId)
        {
            var prescription = await _repository.GetByIdAsync(prescriptionId, includeItems: true);
            if (prescription == null)
            {
                throw new InvalidOperationException("Prescription not found");
            }

            if (prescription.Status != "approved")
            {
                throw new InvalidOperationException("Prescription must be approved");
            }

            var task = await _taskRepository.GetByIdAsync(taskId);
            if (task == null || task.Status != "pending")
            {
                throw new InvalidOperationException("Task must be pending");
            }

            // Gán patient vào task
            var success = await _repository.AssignPrescriptionToTaskAsync(prescriptionId, taskId);
            if (!success)
            {
                throw new InvalidOperationException("Failed to assign");
            }

            // Gán items vào compartment assignments (tự động gán nếu có available)
            var assignedCount = 0;
            var availableAssignments = await _compartmentAssignmentRepository.GetAllAsync(taskId, "pending");
            foreach (var item in prescription.PrescriptionItems)
            {
                var assignment = availableAssignments.FirstOrDefault(a => a.Status == "pending");
                if (assignment != null)
                {
                    assignment.ItemDesc = $"{item.Quantity} x {item.Medicine.Name} ({item.Dosage})";
                    assignment.Status = "loaded"; // Auto-loaded sau gán
                    await _compartmentAssignmentRepository.UpdateAsync(assignment.Id, assignment);
                    assignedCount++;
                }
            }

            return new AssignPrescriptionResponseDto
            {
                TaskId = taskId,
                PrescriptionId = prescriptionId,
                PrescriptionCode = prescription.PrescriptionCode,
                PatientId = prescription.PatientId,
                PatientName = prescription.Patient.FullName,
                AssignedItemsCount = assignedCount,
                Message = $"Assigned {assignedCount}/{prescription.PrescriptionItems.Count} items to task compartments"
            };
        }

        public async Task<PrescriptionResponseDto> CreateAsync(PrescriptionDto prescriptionDto, ulong currentUserId)
        {
            var existing = await _repository.GetByCodeAsync(prescriptionDto.PrescriptionCode);
            if (existing != null)
            {
                throw new InvalidOperationException("Prescription code already exists");
            }

            var patient = await _patientRepository.GetByIdAsync(prescriptionDto.PatientId);
            if (patient == null)
            {
                throw new InvalidOperationException("Patient not found");
            }

            var user = await _userRepository.GetByIdAsync(currentUserId);
            if (user == null)
            {
                throw new InvalidOperationException($"User with ID {currentUserId} not found");
            }

            var prescription = _mapper.Map<Prescription>(prescriptionDto);
            prescription.UsersId = currentUserId;
            prescription.CreatedAt = DateTime.UtcNow;

            var createdPrescription = await _repository.CreateAsync(prescription);

            // Tạo items
            foreach (var itemDto in prescriptionDto.Items)
            {
                var item = _mapper.Map<PrescriptionItem>(itemDto);
                item.PrescriptionId = createdPrescription.Id;
                await _itemRepository.CreateAsync(item);
            }

            var fullPrescription = await _repository.GetByIdAsync(createdPrescription.Id, includeItems: true, includePatient: true);
            return _mapper.Map<PrescriptionResponseDto>(fullPrescription);
        }

        public async Task<IEnumerable<PrescriptionResponseDto>> GetAllAsync(ulong? patientId = null, string? status = null)
        {
            var prescriptions = await _repository.GetAllAsync(patientId, status);
            return _mapper.Map<IEnumerable<PrescriptionResponseDto>>(prescriptions);
        }

        public async Task<PrescriptionResponseDto?> GetByIdAsync(ulong id)
        {
            var prescription = await _repository.GetByIdAsync(id, includeItems: true, includePatient: true);
            return prescription != null ? _mapper.Map<PrescriptionResponseDto>(prescription) : null;
        }

        public async Task<PrescriptionResponseDto?> UpdateStatusAsync(ulong id, string status)
        {
            var prescription = await _repository.GetByIdAsync(id);
            if (prescription == null)
            {
                throw new InvalidOperationException("Prescription not found");
            }

            prescription.Status = status;
            var updated = await _repository.UpdateAsync(id, prescription);

            return updated != null ? _mapper.Map<PrescriptionResponseDto>(updated) : null;
        }
    }
}
