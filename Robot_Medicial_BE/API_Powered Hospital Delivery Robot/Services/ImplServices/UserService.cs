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
    /// <summary>
    /// Quản lý tài khoản User
    /// </summary>
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

        /// <summary>
        /// Tạo tài khoản User mới
        /// </summary>
        public async Task<UserResponseDto> CreateAsync(UserDto userDto)
        {
            var existing = await _repository.GetByEmailAsync(userDto.Email);
            if (existing != null)
                throw new InvalidOperationException("Email đã tồn tại");

            var role = userDto.Role?.Trim().ToLowerInvariant();
            if (role is null || (role != "doctor" && role != "pharmacist"))
                throw new InvalidOperationException("Vai trò phải là 'doctor' hoặc 'pharmacist' khi tạo User.");

            var user = _mapper.Map<User>(userDto);

            user.Role = role;

            user.PasswordHash = HashPassword(userDto.Password);
            user.CreatedAt = DateTime.Now;
            user.UpdatedAt = DateTime.Now;
            user.IsActive = userDto.IsActive;

            var created = await _repository.CreateAsync(user);

            // Gửi email thông báo tài khoản đã được tạo thành công
            await _emailHelper.SendEmailAsync(
                user.Email,
                "Tài khoản đã được tạo thành công",
                $"<h3>Xin chào, {userDto.FullName ?? "User"}!</h3>" +
                $"<p>Tài khoản của bạn đã được tạo thành công trên hệ thống Robot Quản lý Bệnh viện.</p>" +
                $"<p><strong>Thông tin tài khoản:</strong></p>" +
                $"<ul>" +
                $"<li>Email đăng nhập: <b>{user.Email}</b></li>" +
                $"<li>Mật khẩu: <b>{userDto.Password}</b></li>" +
                $"<li>Vai trò: <b>{(role == "doctor" ? "Bác sĩ" : "Dược sĩ")}</b></li>" +
                $"<li>Trạng thái: <b>{(user.IsActive == true ? "Đã kích hoạt" : "Chờ kích hoạt")}</b></li>" +
                $"</ul>" +
                $"<p>Bạn có thể đăng nhập vào hệ thống bằng email và mật khẩu đã được cung cấp.</p>" +
                $"<p>Trân trọng,<br/>Đội ngũ Quản lý Bệnh viện</p>"
            );

            return _mapper.Map<UserResponseDto>(created);
        }

        /// <summary>
        /// Lấy danh sách tất cả User (có thể lọc theo trạng thái active)
        /// </summary>
        public async Task<IEnumerable<UserResponseDto>> GetAllAsync(bool? isActive = null)
        {
            var users = await _repository.GetAllAsync(isActive);
            var userDtos = new List<UserResponseDto>();
            
            foreach (var user in users)
            {
                // Load sessions để tính IsOnline
                await _context.Entry(user).Collection(u => u.Sessions).LoadAsync();
                var responseDto = _mapper.Map<UserResponseDto>(user);
                
                // Tính IsOnline: Có session active (expires_at > now)
                var activeSessions = user.Sessions.Where(s => s.ExpiresAt > DateTime.Now).ToList();
                responseDto.IsOnline = activeSessions.Any();
                responseDto.ActiveSessions = _mapper.Map<IEnumerable<SessionResponseDto>>(activeSessions);
                
                userDtos.Add(responseDto);
            }
            
            return userDtos;
        }

        /// <summary>
        /// Lấy chi tiết User theo ID
        /// </summary>
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

        /// <summary>
        /// Lấy trạng thái User (real-time status)
        /// </summary>
        public async Task<UserStatusDto> GetUserStatusAsync(ulong id)
        {
            var user = await _repository.GetByIdAsync(id, includeTasks: false, includeSessions: true);
            if (user == null)
            {
                throw new InvalidOperationException("Không tìm thấy User");
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

        /// <summary>
        /// Bật/tắt trạng thái active của User
        /// </summary>
        public async Task<bool> ToggleActiveAsync(ulong id, bool isActive)
        {
            var existing = await _repository.GetByIdAsync(id);
            if (existing == null)
            {
                return false;
            }

            if (!isActive && existing.Role == "admin")
            {
                throw new InvalidOperationException("Không thể vô hiệu hóa admin");
            }

            existing.IsActive = isActive;
            existing.UpdatedAt = DateTime.Now;
            await _repository.UpdateAsync(id, existing);
            return true;
        }

        /// <summary>
        /// Cập nhật thông tin User
        /// </summary>
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
                user.PasswordHash = existing.PasswordHash;  // Giữ mật khẩu cũ
            }

            var updated = await _repository.UpdateAsync(id, user);
            return updated != null ? _mapper.Map<UserResponseDto>(updated) : null;
        }

        /// <summary>
        /// Băm mật khẩu bằng SHA256
        /// </summary>
        public string HashPassword(string password)
        {
            using (var sha = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

        /// <summary>
        /// Thêm User mới
        /// </summary>
        public async System.Threading.Tasks.Task AddUserAsync(User user)
            => await _repository.AddUserAsync(user);

        /// <summary>
        /// Lấy User theo email
        /// </summary>
        public async Task<User?> GetByEmailAsync(string email)
        {
            return await _repository.GetByEmailAsync(email);
        }

        /// <summary>
        /// Cập nhật thông tin User
        /// </summary>
        public async System.Threading.Tasks.Task UpdateUserAsync(User user)
            => await _repository.UpdateUserAsync(user);

        /// <summary>
        /// Đăng ký tài khoản mới
        /// </summary>
        public async Task<string> RegisterAsync(RegisterRequest request)
        {
            request.Email = request.Email.Trim().ToLower();

            var existingUser = await GetByEmailAsync(request.Email);

            if (existingUser != null)
            {
                // Nếu User đã kích hoạt rồi → báo lỗi
                if (existingUser.IsActive == true)
                    return "Email đã tồn tại.";

                // Nếu User chưa active → gửi lại OTP
                string otp = new Random().Next(100000, 999999).ToString();
                _cache.Set($"OTP_{request.Email}", otp, TimeSpan.FromMinutes(5));

                await _emailHelper.SendEmailAsync(
                    request.Email,
                    "Xác nhận đăng ký tài khoản",
                    $"<h3>Mã OTP của bạn là: <b>{otp}</b></h3><p>Mã OTP có hiệu lực trong 5 phút.</p>"
                );

                return "Tài khoản của bạn chưa được kích hoạt. Một mã OTP mới đã được gửi đến email của bạn.";
            }

            // Nếu User chưa tồn tại → tạo mới
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

        /// <summary>
        /// Xác minh OTP để kích hoạt tài khoản
        /// </summary>
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

        /// <summary>
        /// Băm token bằng SHA256
        /// </summary>
        private string HashToken(string token)
        {
            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(token);
            var hash = sha256.ComputeHash(bytes);
            return Convert.ToBase64String(hash);
        }

        

        /// <summary>
        /// Đăng nhập
        /// </summary>
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

            // Tạo session mới (cho phép nhiều thiết bị)
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

            // Reload user để có session mới nhất
            await _context.Entry(user).Collection(u => u.Sessions).LoadAsync();
            // Báo realtime toàn hệ thống: User này đang online
            if (_hubContext != null)
                await _hubContext.Clients.All.SendAsync("UserOnline", user.Id.ToString());

            return ($"Bearer {token}", "Đăng nhập thành công.");
        }

        /// <summary>
        /// Đăng xuất tài khoản
        /// </summary>
        /// <summary>
        /// Đăng xuất (hủy session theo token)
        /// </summary>
        public async System.Threading.Tasks.Task LogoutAsync(string token)
        {
            if (string.IsNullOrEmpty(token)) return;

            string tokenHash = HashToken(token);
            var session = await _repository.GetSessionByTokenHashAsync(tokenHash);
            if (session != null)
            {
                var userId = session.UserId;
                session.ExpiresAt = DateTime.Now.AddMinutes(-1);
                await _repository.UpdateSessionAsync(session);

                // Kiểm tra xem user còn session active nào không
                var user = await _repository.GetByIdAsync(userId, includeSessions: true);
                if (user != null)
                {
                    await _context.Entry(user).Collection(u => u.Sessions).LoadAsync();
                    var activeSessions = user.Sessions.Where(s => s.ExpiresAt > DateTime.Now).ToList();
                    
                    // Nếu không còn session nào active, báo UserOffline
                    if (!activeSessions.Any() && _hubContext != null)
                    {
                        await _hubContext.Clients.All.SendAsync("UserOffline", userId.ToString());
                    }
                }
            }
        }

        /// <summary>
        /// Đăng xuất (hủy session theo username)
        /// </summary>
        public Task<string> LogoutAsync(HttpContext context, string username)
        {
            context.Session.Remove($"UserToken_{username}");
            return System.Threading.Tasks.Task.FromResult("Đăng xuất thành công!");
        }

        /// <summary>
        /// Yêu cầu đặt lại mật khẩu (gửi OTP)
        /// </summary>
        public async Task<string> RequestForgotPasswordAsync(ForgotPasswordRequest request)
        {
            // Tìm User theo email
            var allUsers = await _repository.GetAllAsync();
            var user = allUsers.FirstOrDefault(u => u.Email == request.Email);

            if (user == null)
                return "Không tìm thấy tài khoản với email này.";

            // Tạo mã OTP ngẫu nhiên
            string otp = new Random().Next(100000, 999999).ToString();

            // Lưu OTP trong cache (5 phút)
            _cache.Set($"FORGOT_{user.Email}", otp, TimeSpan.FromMinutes(5));

            // Gửi OTP đến email User
            await _emailHelper.SendEmailAsync(
                user.Email,
                "Xác minh đặt lại mật khẩu",
                $"<h3>Mã OTP đặt lại mật khẩu của bạn là: <b>{otp}</b></h3><p>Mã OTP có hiệu lực trong 5 phút.</p>"
            );

            return "Mã OTP đã được gửi đến email để đặt lại mật khẩu.";
        }

        /// <summary>
        /// Xác minh OTP và đặt lại mật khẩu
        /// </summary>
        public async Task<string> VerifyForgotPasswordAsync(VerifyForgotPasswordRequest request)
        {
            // Kiểm tra OTP trong cache
            if (!_cache.TryGetValue($"FORGOT_{request.Email}", out string? storedOtp))
                return "Mã OTP đã hết hạn hoặc không tồn tại.";

            if (storedOtp != request.Otp)
                return "Mã OTP không hợp lệ.";

            // Lấy User theo email
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

        /// <summary>
        /// Admin đặt lại mật khẩu cho User
        /// </summary>
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

        /// <summary>
        /// Tạo mật khẩu ngẫu nhiên
        /// </summary>
        private string GenerateRandomPassword(int length = 8)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        /// <summary>
        /// Lấy thông tin profile theo email
        /// </summary>
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

        /// <summary>
        /// Cập nhật thông tin profile
        /// </summary>
        public async Task<ProfileResponseDto?> UpdateProfileAsync(string email, UpdateProfileDto dto)
        {
            var user = await _repository.GetByEmailAsync(email);
            if (user == null)
                throw new InvalidOperationException("Không tìm thấy người dùng.");

            // Chỉ cập nhật FullName và các field được phép
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

        /// <summary>
        /// Đổi mật khẩu
        /// </summary>
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

        /// <summary>
        /// Buộc đăng xuất tất cả session của User
        /// </summary>
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

                // Báo realtime: báo User bị đá ra
                if (_hubContext != null)
                    await _hubContext.Clients.All.SendAsync("UserOffline", userId.ToString());
            }

            return new { message = $"Đã đá tất cả thiết bị của {user.Email} ra khỏi hệ thống" };
        }
    }
}
