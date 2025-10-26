using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repository;
        private readonly IMapper _mapper;

        public UserService(IUserRepository repository, IMapper mapper)
        {
            _repository = repository;
            _mapper = mapper;
        }

        public async Task<UserResponseDto> CreateAsync(UserDto userDto)
        {
            var existing = await _repository.GetByUsernameAsync(userDto.Username);
            if (existing != null)
            {
                throw new Exception("Username already exist");
            }
            var user = _mapper.Map<User>(userDto);
            user.PasswordHash = userDto.Password;
            user.CreatedAt = DateTime.Now;
            user.IsActive = true;
            var created = await _repository.CreateAsync(user);
            return _mapper.Map<UserResponseDto>(created);
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllAsync(bool? isActive = null)
        {
            var user = await _repository.GetAllAsync(isActive);
            return _mapper.Map<IEnumerable<UserResponseDto>>(user);
        }

        public async Task<UserResponseDto?> GetByIdAsync(ulong id)
        {
            var user = await _repository.GetByIdAsync(id);
            if (user != null)
            {
                return _mapper.Map<UserResponseDto>(user);
            }
            return null;
        }

        public async Task<bool> ToggleActiveAsync(ulong id, bool isActive)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null) return false;
            if (existing.Role == "admin")
            {
                throw new Exception("Cannot deactivate admin user");
            }
            existing.IsActive = isActive;
            existing.UpdatedAt = DateTime.Now;
            await _repository.UpdateAsync(id, existing);

            return true;
        }

        public async Task<UserResponseDto?> UpdateAsync(ulong id, UserDto userDto)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                throw new InvalidOperationException("User not found");
            }

            if (userDto.Username != existing.Username)
            {
                var usernameExisting = await _repository.GetByUsernameAsync(userDto.Username);
                if (usernameExisting != null)
                {
                    throw new InvalidOperationException("Username already exists");
                }
            }

            var user = _mapper.Map<User>(userDto);
            if (!string.IsNullOrEmpty(userDto.Password))
            {
                user.PasswordHash = userDto.Password;
            }
            else
            {
                user.PasswordHash = existing.PasswordHash;  // Giữ password cũ
            }
            user.Id = id;
            user.UpdatedAt = DateTime.Now;

            var updated = await _repository.UpdateAsync(id, user);
            if (updated != null)
            {
                return _mapper.Map<UserResponseDto>(updated);
            }

            return null;
        }
    }
}
