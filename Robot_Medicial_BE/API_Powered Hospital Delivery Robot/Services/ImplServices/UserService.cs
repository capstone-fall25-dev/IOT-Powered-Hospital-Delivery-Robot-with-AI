using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
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
        public Task<bool> ExistsByUsernameAsync(string username)
            => _repository.ExistsByUsernameAsync(username);

        public async System.Threading.Tasks.Task AddUserAsync(User user)
            => await _repository.AddUserAsync(user);

        public async Task<User?> GetByUsernameAsync(string username)
            => await _repository.GetByUsernameAsync(username);

        public async System.Threading.Tasks.Task UpdateUserAsync(User user)
            => await _repository.UpdateUserAsync(user);

        //public async Task<string> RegisterAsync(RegisterRequest request)
        //{
        //    if (await ExistsByUsernameAsync(request.Username))
        //        return "Username already exists.";

        //    //var user = new User
        //    //{
        //    //    Username = request.Username,
        //    //    PasswordHash = HashPassword(request.Password),
        //    //    FullName = "Co y ta xinh dep",
        //    //    Role = "operator",
        //    //    IsActive = false,
        //    //    CreatedAt = DateTime.Now,
        //    //    UpdatedAt = DateTime.Now
        //    //};

        //    var user = _mapper.Map<User>(request);
        //    user.PasswordHash = HashPassword(request.Password);

        //    await AddUserAsync(user);

        //    string otp = new Random().Next(100000, 999999).ToString();
        //    _cache.Set($"OTP_{request.Username}", otp, TimeSpan.FromMinutes(5));

        //    await _emailHelper.SendEmailAsync(
        //        request.Email,
        //        "Xác thực đăng ký tài khoản",
        //        $"<h3>Mã OTP của bạn là: <b>{otp}</b></h3><p>OTP có hiệu lực trong 5 phút.</p>"
        //    );

        //    return "OTP đã được gửi về email của bạn. Vui lòng xác thực.";
        //}


        //public async Task<string> VerifyOtpAsync(VerifyOtpRequest request)
        //{
        //    if (!_cache.TryGetValue($"OTP_{request.Username}", out string? storedOtp))
        //        return "OTP đã hết hạn hoặc không tồn tại.";

        //    if (storedOtp != request.Otp)
        //        return "OTP không hợp lệ.";

        //    var user = await GetByUsernameAsync(request.Username);
        //    if (user == null)
        //        return "Không tìm thấy người dùng.";

        //    user.IsActive = true;
        //    user.UpdatedAt = DateTime.Now;
        //    await UpdateUserAsync(user);

        //    _cache.Remove($"OTP_{request.Username}");

        //    return "Xác thực thành công, tài khoản đã được kích hoạt!";
        //}


        public async Task<string> RegisterAsync(RegisterRequest request)
        {
            if (await ExistsByUsernameAsync(request.Username))
                return "Username already exists.";

            //var user = new User
            //{
            //    Username = request.Username,
            //    PasswordHash = HashPassword(request.Password),
            //    FullName = "Beautiful nurse",
            //    Role = "operator",
            //    IsActive = false,
            //    CreatedAt = DateTime.Now,
            //    UpdatedAt = DateTime.Now
            //};

            var user = _mapper.Map<User>(request);
            user.PasswordHash = HashPassword(request.Password);

            await AddUserAsync(user);

            string otp = new Random().Next(100000, 999999).ToString();
            _cache.Set($"OTP_{request.Username}", otp, TimeSpan.FromMinutes(5));

            await _emailHelper.SendEmailAsync(
                request.Email,
                "Account Registration Verification",
                $"<h3>Your OTP code is: <b>{otp}</b></h3><p>The OTP is valid for 5 minutes.</p>"
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



        public async Task<(string Token, string Message)> LoginAsync(LoginDto request)
        {
            var user = await GetByUsernameAsync(request.Username);
            if (user == null || user.PasswordHash != HashPassword(request.Password) || user.IsActive == false)
                return (string.Empty, "UserName, Password incorrect or Account is not Active!.");

            string token = JwtHelper.GenerateToken(user, _configuration);
            return ($"Bearer {token}", "Login Successful!");
        }


        public Task<string> LogoutAsync(HttpContext context)
        {
            context.Session.Remove("AuthToken");
            return System.Threading.Tasks.Task.FromResult("Log out Successful!");
        }



    }
}
