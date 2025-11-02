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
            var existing = await _repository.GetByEmailAsync(userDto.Email);
            if (existing != null)
            {
                throw new InvalidOperationException("Email already exists");
            }

            var user = _mapper.Map<User>(userDto);
            //user.PasswordHash = BCrypt.HashPassword(userDto.Password);
            user.PasswordHash = userDto.Password;
            user.CreatedAt = DateTime.UtcNow;
            user.UpdatedAt = DateTime.UtcNow;
            user.IsActive = true;

            var created = await _repository.CreateAsync(user);
            return _mapper.Map<UserResponseDto>(created);
        }

        public async Task<IEnumerable<UserResponseDto>> GetAllAsync(bool? isActive = null)
        {
            var users = await _repository.GetAllAsync(isActive);
            return _mapper.Map<IEnumerable<UserResponseDto>>(users);
        }

        public async Task<UserResponseDto?> GetByIdAsync(ulong id)
        {
            var user = await _repository.GetByIdAsync(id, includeTasks: true, includeSessions: true);
            if (user == null) return null;

            var response = _mapper.Map<UserResponseDto>(user);

            // Tính IsOnline: Có session active (expires_at > now)
            var activeSessions = user.Sessions.Where(s => s.ExpiresAt > DateTime.UtcNow).ToList();
            response.ActiveSessions = _mapper.Map<IEnumerable<SessionResponseDto>>(activeSessions);
            response.IsOnline = activeSessions.Any();

            // Tasks: Map từ entity
            response.Tasks = _mapper.Map<IEnumerable<TaskResponseDto>>(user.Tasks);

            return response;
        }

        // Endpoint riêng cho real-time status (polling)
        public async Task<UserStatusDto> GetUserStatusAsync(ulong id)
        {
            var user = await _repository.GetByIdAsync(id, includeTasks: false, includeSessions: true);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            var activeSessions = user.Sessions.Where(s => s.ExpiresAt > DateTime.UtcNow).ToList();
            var isOnline = activeSessions.Any();

            return new UserStatusDto
            {
                IsOnline = isOnline,
                ActiveSessions = _mapper.Map<IEnumerable<SessionResponseDto>>(activeSessions),
                LastActivity = activeSessions.OrderByDescending(s => s.CreatedAt).FirstOrDefault()?.CreatedAt ?? user.UpdatedAt
            };
        }

        public async Task<bool> ToggleActiveAsync(ulong id, bool isActive)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                return false;
            }

            if (!isActive && existing.Role == "admin")
            {
                throw new InvalidOperationException("Cannot deactivate admin user");
            }

            existing.IsActive = isActive;
            existing.UpdatedAt = DateTime.UtcNow;
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

            if (userDto.Email != existing.Email)
            {
                var emailExisting = await _repository.GetByEmailAsync(userDto.Email);
                if (emailExisting != null)
                {
                    throw new InvalidOperationException("Email already exists");
                }
            }

            var user = _mapper.Map<User>(userDto);
            user.Id = id;
            user.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrEmpty(userDto.Password))
            {
                //user.PasswordHash = BCrypt.HashPassword(userDto.Password);
                user.PasswordHash = userDto.Password;
            }

            var updated = await _repository.UpdateAsync(id, user);
            return updated != null ? _mapper.Map<UserResponseDto>(updated) : null;
        }
    }
}
