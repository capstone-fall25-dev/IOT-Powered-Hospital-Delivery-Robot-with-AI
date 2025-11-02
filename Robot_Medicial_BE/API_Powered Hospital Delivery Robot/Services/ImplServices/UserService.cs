using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Cryptography;
using System.Text;

namespace API_Powered_Hospital_Delivery_Robot.Services.ImplServices
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repository;
        private readonly EmailHelper _emailHelper;
        private readonly IMemoryCache _cache;
        private readonly IConfiguration _configuration;
        private readonly IMapper _mapper;

        public UserService(IUserRepository repository,
            EmailHelper emailHelper,
            IMemoryCache cache,
            IConfiguration configuration,
            IMapper mapper)
        {
            _repository = repository;
            _emailHelper = emailHelper;
            _cache = cache;
            _configuration = configuration;
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

            if (userDto.Username != existing.FullName)
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


        // namnvdev_LoginLogout


        public string HashPassword(string password)
        {
            using (var sha = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }
  
        public async System.Threading.Tasks.Task AddUserAsync(User user)
            => await _repository.AddUserAsync(user);

        public async Task<User?> GetByUsernameAsync(string username)
            => await _repository.GetByUsernameAsync(username);

        public async System.Threading.Tasks.Task UpdateUserAsync(User user)
            => await _repository.UpdateUserAsync(user);



        public async Task<string> RegisterAsync(RegisterRequest request)
        {
            request.Username = request.Email.Trim().ToLower();

            var existingUser = await GetByUsernameAsync(request.Username);

            if (existingUser != null)
            {
                // Nếu user đã kích hoạt rồi → báo lỗi
                if (existingUser.IsActive == true)
                    return "Username already exists.";

                // Nếu user chưa active → gửi lại OTP
                string otp = new Random().Next(100000, 999999).ToString();
                _cache.Set($"OTP_{request.Username}", otp, TimeSpan.FromMinutes(5));

                await _emailHelper.SendEmailAsync(
                    request.Email,
                    "Account Registration Verification",
                    $"<h3>Your OTP code is: <b>{otp}</b></h3><p>The OTP is valid for 5 minutes.</p>"
                );

                return "Your account is not yet activated. A new OTP has been sent to your email.";
            }

            // Nếu user chưa tồn tại → tạo mới
            var user = _mapper.Map<User>(request);
            user.PasswordHash = HashPassword(request.Password);
            user.IsActive = false;

            await AddUserAsync(user);

            string newOtp = new Random().Next(100000, 999999).ToString();
            _cache.Set($"OTP_{request.Username}", newOtp, TimeSpan.FromMinutes(5));

            await _emailHelper.SendEmailAsync(
                request.Email,
                "Account Registration Verification",
                $"<h3>Your OTP code is: <b>{newOtp}</b></h3><p>The OTP is valid for 5 minutes.</p>"
            );

            return "OTP has been sent to your email. Please verify your account.";
        }



        public async Task<string> VerifyOtpAsync(VerifyOtpRequest request)
        {
            if (!_cache.TryGetValue($"OTP_{request.Username}", out string? storedOtp))
                return "OTP has expired or does not exist.";

            if (storedOtp != request.Otp)
                return "Invalid OTP.";

            var user = await GetByUsernameAsync(request.Username);
            if (user == null)
                return "User not found.";

            user.IsActive = true;
            user.UpdatedAt = DateTime.Now;
            await UpdateUserAsync(user);

            _cache.Remove($"OTP_{request.Username}");

            return "Verification successful, your account has been activated!";
        }



        public async Task<(string Token, string Message)> LoginAsync(LoginDto request, HttpContext context)
        {
            var user = await GetByUsernameAsync(request.Username);
            if (user == null || user.PasswordHash != HashPassword(request.Password) || user.IsActive == false)
                return (string.Empty, "UserName, Password incorrect or Account is not Active!.");

            // Sinh token mới
            string token = JwtHelper.GenerateToken(user, _configuration);

            // Lưu token vào session (mỗi user chỉ có 1 token hợp lệ)
            context.Session.SetString($"UserToken_{user.Email}", token);

            return ($"Bearer {token}", "Login Successful!");
        }



        public Task<string> LogoutAsync(HttpContext context, string username)
        {
            context.Session.Remove($"UserToken_{username}");
            return System.Threading.Tasks.Task.FromResult("Log out Successful!");
        }


        public async Task<string> RequestForgotPasswordAsync(ForgotPasswordRequest request)
        {
            // Tìm user theo email
            var allUsers = await _repository.GetAllAsync();
            var user = allUsers.FirstOrDefault(u => u.Email == request.Email);

            if (user == null)
                return "No account found with this email.";

            // Tạo mã OTP ngẫu nhiên
            string otp = new Random().Next(100000, 999999).ToString();

            // Lưu OTP trong cache (5 phút)
            _cache.Set($"FORGOT_{user.Email}", otp, TimeSpan.FromMinutes(5));

            // Gửi OTP đến email người dùng
            await _emailHelper.SendEmailAsync(
                user.Email,
                "Password Reset Verification",
                $"<h3>Your password reset OTP is: <b>{otp}</b></h3><p>The OTP is valid for 5 minutes.</p>"
            );

            return "OTP has been sent to your email for password reset.";
        }

        public async Task<string> VerifyForgotPasswordAsync(VerifyForgotPasswordRequest request)
        {
            // Kiểm tra OTP trong cache
            if (!_cache.TryGetValue($"FORGOT_{request.Email}", out string? storedOtp))
                return "OTP has expired or does not exist.";

            if (storedOtp != request.Otp)
                return "Invalid OTP.";

            // Lấy user theo email
            var allUsers = await _repository.GetAllAsync();
            var user = allUsers.FirstOrDefault(u => u.Email == request.Email);

            if (user == null)
                return "User not found.";

            // Cập nhật mật khẩu mới
            user.PasswordHash = HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.Now;
            await UpdateUserAsync(user);

            // Xóa OTP khỏi cache
            _cache.Remove($"FORGOT_{request.Email}");

            return "Password reset successful! You can now log in with your new password.";
        }




    }
}
