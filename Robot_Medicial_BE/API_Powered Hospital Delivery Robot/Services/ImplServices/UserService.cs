using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using AutoMapper;
using Microsoft.AspNetCore.SignalR;
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
        private readonly RobotManagerContext _context;
        private readonly IHubContext<UserStatusHub> _hubContext;

        public UserService(IUserRepository repository,
            EmailHelper emailHelper,
            IMemoryCache cache,
            IConfiguration configuration,
            IMapper mapper, 
            RobotManagerContext context,
            IHubContext<UserStatusHub> hubContext)
        {
            _repository = repository;
            _emailHelper = emailHelper;
            _cache = cache;
            _configuration = configuration;
            _mapper = mapper;
            _context = context;
            _hubContext = hubContext;
        }

        public async Task<UserResponseDto> CreateAsync(UserDto userDto)
        {
            var existing = await _repository.GetByEmailAsync(userDto.Email);
            if (existing != null)
                throw new InvalidOperationException("Email đã tồn tại");

            var role = userDto.Role?.Trim().ToLowerInvariant();
            if (role is null || (role != "doctor" && role != "pharmacist"))
                throw new InvalidOperationException("Role phải là 'doctor' hoặc 'pharmacist' khi tạo user.");

            var user = _mapper.Map<User>(userDto);

            user.Role = role;

            user.PasswordHash = HashPassword(userDto.Password);
            user.CreatedAt = DateTime.Now;
            user.UpdatedAt = DateTime.Now;
            user.IsActive = false; // kích hoạt sau khi xác minh OTP

            var created = await _repository.CreateAsync(user);

            string otp = new Random().Next(100000, 999999).ToString();
            _cache.Set($"OTP_{user.Email}", otp, TimeSpan.FromMinutes(5));
            await _emailHelper.SendEmailAsync(
                user.Email,
                "Xác minh tài khoản",
                $"<h3>Chào mừng, {userDto.FullName ?? "User"}!</h3>" +
                $"<p>Mã xác minh của bạn là: <b>{otp}</b></p>" +
                $"<p>Mã có hiệu lực trong 5 phút.</p>"
            );

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
            await _context.Entry(user).Collection(u => u.Sessions).LoadAsync();
            var response = _mapper.Map<UserResponseDto>(user);

            // Tính IsOnline: Có session active (expires_at > now)
            var activeSessions = user.Sessions.Where(s => s.ExpiresAt > DateTime.Now).ToList();
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
                throw new InvalidOperationException("Không tìm thấy user");
            }

            var activeSessions = user.Sessions.Where(s => s.ExpiresAt > DateTime.Now).ToList();
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
                throw new InvalidOperationException("Không thể vô hiệu hóa user admin");
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
                throw new InvalidOperationException("User không tồn tại");
            }

            if (userDto.Email != existing.Email)
            {
                var emailExisting = await _repository.GetByEmailAsync(userDto.Email);
                if (emailExisting != null)
                {
                    throw new InvalidOperationException("Email đã tồn tại");
                }
            }

            var user = _mapper.Map<User>(userDto);
            user.Id = id;
            user.UpdatedAt = DateTime.Now;
            if (!string.IsNullOrEmpty(userDto.Password))
            {
                user.PasswordHash = HashPassword(userDto.Password);
            }
            else
            {
                user.PasswordHash = existing.PasswordHash;  // Giữ password cũ
            }

            var updated = await _repository.UpdateAsync(id, user);
            return updated != null ? _mapper.Map<UserResponseDto>(updated) : null;
        }

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

        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _repository.GetByEmailAsync(email);
        }

        public async System.Threading.Tasks.Task UpdateUserAsync(User user)
            => await _repository.UpdateUserAsync(user);

        public async Task<string> RegisterAsync(RegisterRequest request)
        {
            request.Email = request.Email.Trim().ToLower();

            var existingUser = await GetByEmailAsync(request.Email);

            if (existingUser != null)
            {
                // Nếu user đã kích hoạt rồi → báo lỗi
                if (existingUser.IsActive == true)
                    return "Email đã tồn tại.";

                // Nếu user chưa active → gửi lại OTP
                string otp = new Random().Next(100000, 999999).ToString();
                _cache.Set($"OTP_{request.Email}", otp, TimeSpan.FromMinutes(5));

                await _emailHelper.SendEmailAsync(
                    request.Email,
                    "Xác nhận đăng ký tài khoản",
                    $"<h3>Mã OTP của bạn là: <b>{otp}</b></h3><p>Mã OTP có hiệu lực trong 5 phút.</p>"
                );

                return "Tài khoản của bạn chưa được kích hoạt. Một mã OTP mới đã được gửi đến email của bạn.";
            }

            // Nếu user chưa tồn tại → tạo mới
            var user = _mapper.Map<User>(request);
            user.PasswordHash = HashPassword(request.Password);
            user.IsActive = false;
            user.Role = "doctor";

            await AddUserAsync(user);

            string newOtp = new Random().Next(100000, 999999).ToString();
            _cache.Set($"OTP_{request.Email}", newOtp, TimeSpan.FromMinutes(5));

            await _emailHelper.SendEmailAsync(
                request.Email,
                "Xác nhận đăng ký tài khoản",
                $"<h3>Mã OTP của bạn là: <b>{newOtp}</b></h3><p>Mã OTP có hiệu lực trong 5 phút.</p>"
            );

            return "Mã OTP đã được gửi tới email của bạn. Vui lòng xác nhận tài khoản.";
        }

        public async Task<string> VerifyOtpAsync(VerifyOtpRequest request)
        {
            if (!_cache.TryGetValue($"OTP_{request.Email}", out string? storedOtp))
                return "Mã OTP đã hết hạn hoặc không tồn tại.";

            if (storedOtp != request.Otp)
                return "Mã OTP không hợp lệ.";

            var user = await GetByEmailAsync(request.Email);
            if (user == null)
                return "Không tìm thấy người dùng.";

            user.IsActive = true;
            user.UpdatedAt = DateTime.Now;
            await UpdateUserAsync(user);

            _cache.Remove($"OTP_{request.Email}");

            return "Xác nhận thành công, tài khoản của bạn đã được kích hoạt!";
        }

        private string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        //public async Task<(string Token, string Message)> LoginAsync(LoginDto request, HttpContext context)
        //{
        //    var user = await GetByEmailAsync(request.Email);
        //    if (user == null || user.IsActive == false)
        //        return (string.Empty, "Email hoặc mật khẩu không hợp lệ hoặc tài khoản bị khóa.");

        //    // Kiểm tra mật khẩu sai nhiều lần
        //    string failKey = $"LOGIN_FAIL_{user.Email}";
        //    _cache.TryGetValue(failKey, out int failCount);

        //    if (user.PasswordHash != HashPassword(request.Password))
        //    {
        //        failCount++;
        //        _cache.Set(failKey, failCount, TimeSpan.FromMinutes(10));
        //        if (failCount >= 5)
        //        {
        //            user.IsActive = false;
        //            await UpdateUserAsync(user);
        //            _cache.Remove(failKey);
        //            return (string.Empty, "Tài khoản đã bị khóa do nhập sai quá nhiều lần.");
        //        }
        //        return (string.Empty, $"Sai mật khẩu. Còn {5 - failCount} lần thử.");
        //    }

        //    // Đăng nhập thành công
        //    _cache.Remove(failKey);

        //    string token = JwtHelper.GenerateToken(user, _configuration);
        //    string tokenHash = HashToken(token);

        //    // Xóa tất cả session cũ → chỉ cho phép 1 thiết bị
        //    if (user.Sessions != null)
        //    {
        //        foreach (var session in user.Sessions.Where(s => s.ExpiresAt > DateTime.Now))
        //        {
        //            session.ExpiresAt = DateTime.Now.AddMinutes(-1);
        //        }
        //    }

        //    // Tạo session mới
        //    var newSession = new Session
        //    {
        //        UserId = user.Id,
        //        SessionToken = tokenHash,
        //        IpAddress = context.Connection.RemoteIpAddress?.ToString(),
        //        UserAgent = context.Request.Headers["User-Agent"].ToString(),
        //        CreatedAt = DateTime.Now,
        //        ExpiresAt = DateTime.Now.AddHours(24)
        //    };

        //    await _repository.CreateSessionAsync(newSession);
        //    return ($"Bearer { token}", "Đăng nhập thành công.");
        //}

        public async Task<(string Token, string Message)> LoginAsync(LoginDto request, HttpContext context)
        {
            var user = await GetByEmailAsync(request.Email);
            if (user == null || user.IsActive == false)
                return (string.Empty, "Email hoặc mật khẩu không hợp lệ hoặc tài khoản bị khóa.");

            // Kiểm tra mật khẩu sai nhiều lần
            string failKey = $"LOGIN_FAIL_{user.Email}";
            _cache.TryGetValue(failKey, out int failCount);

            if (user.PasswordHash != HashPassword(request.Password))
            {
                failCount++;
                _cache.Set(failKey, failCount, TimeSpan.FromMinutes(10));

                if (failCount >= 5)
                {
                    user.IsActive = false;
                    await UpdateUserAsync(user);
                    _cache.Remove(failKey);
                    return (string.Empty, "Tài khoản đã bị khóa do nhập sai quá nhiều lần.");
                }

                return (string.Empty, $"Sai mật khẩu. Còn {5 - failCount} lần thử.");
            }

            // Đăng nhập thành công
            _cache.Remove(failKey);

            string token = JwtHelper.GenerateToken(user, _configuration);
            string tokenHash = HashToken(token);

            // TẠO SESSION MỚI (không xóa session cũ → cho phép nhiều thiết bị)
            var newSession = new Session
            {
                UserId = user.Id,
                SessionToken = tokenHash,
                IpAddress = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers["User-Agent"].ToString(),
                CreatedAt = DateTime.Now,
                ExpiresAt = DateTime.Now.AddHours(24)
            };
            await _repository.CreateSessionAsync(newSession);

            // === THÊM 2 DÒNG SIÊU QUAN TRỌNG ===
            // 1. Reload user để có session mới nhất
            await _context.Entry(user).Collection(u => u.Sessions).LoadAsync();
            // 2. Báo realtime toàn hệ thống: user này đang online!
            await _hubContext?.Clients.All.SendAsync("UserOnline", user.Id.ToString());

            return ($"Bearer {token}", "Đăng nhập thành công.");
        }


        public async System.Threading.Tasks.Task LogoutAsync(string token)
        {
            if (string.IsNullOrEmpty(token)) return;

            string tokenHash = HashToken(token);
            var session = await _repository.GetSessionByTokenHashAsync(tokenHash);
            if (session != null)
            {
                session.ExpiresAt = DateTime.Now.AddMinutes(-1);
                await _repository.UpdateSessionAsync(session);
            }
        }

        public Task<string> LogoutAsync(HttpContext context, string username)
        {
            context.Session.Remove($"UserToken_{username}");
            return System.Threading.Tasks.Task.FromResult("Đăng xuất thành công!");
        }

        public async Task<string> RequestForgotPasswordAsync(ForgotPasswordRequest request)
        {
            // Tìm user theo email
            var allUsers = await _repository.GetAllAsync();
            var user = allUsers.FirstOrDefault(u => u.Email == request.Email);

            if (user == null)
                return "Không tìm thấy tài khoản với email này.";

            // Tạo mã OTP ngẫu nhiên
            string otp = new Random().Next(100000, 999999).ToString();

            // Lưu OTP trong cache (5 phút)
            _cache.Set($"FORGOT_{user.Email}", otp, TimeSpan.FromMinutes(5));

            // Gửi OTP đến email người dùng
            await _emailHelper.SendEmailAsync(
                user.Email,
                "Xác minh đặt lại mật khẩu",
                $"<h3>Mã OTP đặt lại mật khẩu của bạn là: <b>{otp}</b></h3><p>Mã OTP có hiệu lực trong 5 phút.</p>"
            );

            return "Mã OTP đã được gửi đến email để đặt lại mật khẩu.";
        }

        public async Task<string> VerifyForgotPasswordAsync(VerifyForgotPasswordRequest request)
        {
            // Kiểm tra OTP trong cache
            if (!_cache.TryGetValue($"FORGOT_{request.Email}", out string? storedOtp))
                return "Mã OTP đã hết hạn hoặc không tồn tại.";

            if (storedOtp != request.Otp)
                return "Mã OTP không hợp lệ.";

            // Lấy user theo email
            var allUsers = await _repository.GetAllAsync();
            var user = allUsers.FirstOrDefault(u => u.Email == request.Email);

            if (user == null)
                return "Không tìm thấy người dùng.";

            // Cập nhật mật khẩu mới
            user.PasswordHash = HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.Now;
            await UpdateUserAsync(user);

            // Xóa OTP khỏi cache
            _cache.Remove($"FORGOT_{request.Email}");

            return "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập với mật khẩu mới.";
        }

        public async Task<string> AdminResetPasswordAsync(string email)
        {
            var allUsers = await _repository.GetAllAsync();
            var user = allUsers.FirstOrDefault(u => u.Email == email);

            if (user == null)
                return "Không tìm thấy người dùng.";

            // Tạo mật khẩu ngẫu nhiên (10 ký tự: chữ hoa, chữ thường, số, ký tự đặc biệt)
            string newPassword = GenerateRandomPassword(10);

            // Cập nhật mật khẩu
            user.PasswordHash = HashPassword(newPassword);
            user.UpdatedAt = DateTime.Now;

            await UpdateUserAsync(user);

            // Không gửi email — chỉ trả về mật khẩu mới
            return $"Mật khẩu đã được đặt lại thành công. Mật khẩu mới: {newPassword}";
        }

        private string GenerateRandomPassword(int length = 8)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        // Services/ImplServices/UserService.cs
        // THÊM VÀO CUỐI CLASS UserService

        public async Task<ProfileResponseDto?> GetProfileByEmailAsync(string email)
        {
            var user = await _repository.GetByEmailAsync(email);
            if (user == null) return null;

            return new ProfileResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };
        }

        public async Task<ProfileResponseDto?> UpdateProfileAsync(string email, UpdateProfileDto dto)
        {
            var user = await _repository.GetByEmailAsync(email);
            if (user == null)
                throw new InvalidOperationException("Không tìm thấy người dùng.");

            // Chỉ update FullName và các field được phép
            user.FullName = dto.FullName;
            user.UpdatedAt = DateTime.Now;

            await _repository.UpdateUserAsync(user);

            return new ProfileResponseDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt
            };
        }

        public async Task<string> ChangePasswordAsync(string email, ChangePasswordDto dto)
        {
            var user = await _repository.GetByEmailAsync(email);
            if (user == null)
                throw new InvalidOperationException("Không tìm thấy người dùng.");

            // Kiểm tra mật khẩu hiện tại
            if (user.PasswordHash != HashPassword(dto.CurrentPassword))
                return "Mật khẩu hiện tại không đúng.";

            // Kiểm tra mật khẩu mới không trùng mật khẩu cũ
            if (dto.CurrentPassword == dto.NewPassword)
                return "Mật khẩu mới phải khác mật khẩu hiện tại.";

            // Cập nhật mật khẩu mới
            user.PasswordHash = HashPassword(dto.NewPassword);
            user.UpdatedAt = DateTime.Now;

            await _repository.UpdateUserAsync(user);

            return "Đổi mật khẩu thành công!";
        }

        public async Task<object> ForceLogoutAllSessionsAsync(ulong userId)
        {
            var user = await _repository.GetByIdAsync(userId, includeSessions: true);
            if (user == null) throw new InvalidOperationException("Không tìm thấy người dùng");

            if (user.Sessions != null)
            {
                foreach (var s in user.Sessions)
                {
                    s.ExpiresAt = DateTime.Now.AddMinutes(-1);
                }
                await UpdateUserAsync(user);

                // Báo realtime: báo user bị đá ra
                await _hubContext?.Clients.All.SendAsync("UserOffline", userId.ToString());
            }

            return new { message = $"Đã đá tất cả thiết bị của {user.Email} ra khỏi hệ thống" };
        }
    }
}
