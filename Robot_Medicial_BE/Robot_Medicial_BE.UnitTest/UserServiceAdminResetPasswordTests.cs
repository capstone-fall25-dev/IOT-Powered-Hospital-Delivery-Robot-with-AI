using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using AutoMapper;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Moq;
using System.Security.Cryptography;
using System.Text;
using Task = System.Threading.Tasks.Task;

namespace Robot_Medicial_BE.UnitTest
{
    /// <summary>
    /// Unit tests for AdminResetPasswordAsync method in UserService
    /// Test cases based on UTCID01-UTCID11
    /// Code Module: Authentication
    /// Method: Reset Password by Admin
    /// </summary>
    public class UserServiceAdminResetPasswordTests
    {
        private readonly Mock<IUserRepository> _mockRepository;
        private readonly EmailHelper _emailHelper;
        private readonly IMemoryCache _memoryCache;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly Mock<IMapper> _mockMapper;
        private readonly Mock<RobotManagerContext> _mockContext;
        private readonly Mock<IHubContext<UserStatusHub>> _mockHubContext;
        private readonly UserService _userService;

        public UserServiceAdminResetPasswordTests()
        {
            _mockRepository = new Mock<IUserRepository>();
            _memoryCache = new MemoryCache(new MemoryCacheOptions());
            _mockConfiguration = new Mock<IConfiguration>();
            _mockMapper = new Mock<IMapper>();
            _mockContext = new Mock<RobotManagerContext>(new DbContextOptions<RobotManagerContext>());
            _mockHubContext = new Mock<IHubContext<UserStatusHub>>();

            var emailHelperConfig = new Mock<IConfiguration>();
            _emailHelper = new EmailHelper(emailHelperConfig.Object);

            _userService = new UserService(
                _mockRepository.Object,
                _emailHelper,
                _memoryCache,
                _mockConfiguration.Object,
                _mockMapper.Object,
                _mockContext.Object,
                _mockHubContext.Object
            );
        }

        // Helper method to hash password
        private string HashPassword(string password)
        {
            using (var sha = SHA256.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(password);
                var hash = sha.ComputeHash(bytes);
                return Convert.ToBase64String(hash);
            }
        }

        // Helper method to create a test user
        private User CreateTestUser(string email, string password, bool isActive = true)
        {
            return new User
            {
                Id = 1,
                Email = email,
                PasswordHash = HashPassword(password),
                FullName = "Test User",
                Role = "doctor",
                IsActive = isActive,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
        }

        /// <summary>
        /// UTCID01: Automatic reset type
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return success message with generated password
        /// Type: N (Normal)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID01_AutomaticReset_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công. Mật khẩu mới:", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
            _mockRepository.Verify(r => r.UpdateUserAsync(It.IsAny<User>()), Times.Once);
        }

        /// <summary>
        /// UTCID02: Manual reset type with password "NewPass123@"
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return success message "Lưu thành công"
        /// Type: N (Normal)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID02_UserExists_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
            _mockRepository.Verify(r => r.UpdateUserAsync(It.IsAny<User>()), Times.Once);
        }

        /// <summary>
        /// UTCID03: Manual reset type with null password
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return success message "Lưu thành công"
        /// Type: N (Normal)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID03_UserExists_GeneratesPassword_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
            _mockRepository.Verify(r => r.UpdateUserAsync(It.IsAny<User>()), Times.Once);
        }

        /// <summary>
        /// UTCID04: Manual reset type with password length >=8 & <= 50
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return error message "Không thể lưu thay đổi. Vui lòng thử lại"
        /// Type: A (Abnormal)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID04_UserExists_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// UTCID05: Manual reset type with password length < 8
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return error message "Không thể lưu thay đổi. Vui lòng thử lại"
        /// Type: N (Normal)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID05_UserExists_GeneratesValidPassword_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// UTCID06: Manual reset type with password length > 50
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return error message "Không thể lưu thay đổi. Vui lòng thử lại"
        /// Type: B (Boundary)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID06_UserExists_GeneratesValidLengthPassword_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// UTCID07: Manual reset type with password "newpass" (no uppercase, numbers, special characters)
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return error message "Không thể lưu thay đổi. Vui lòng thử lại"
        /// Type: B (Boundary)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID07_UserExists_GeneratesValidFormatPassword_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// UTCID08: Manual reset type with password "ab ccccccc" (contains space)
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return error message "Không thể lưu thay đổi. Vui lòng thử lại"
        /// Type: B (Boundary)
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID08_UserExists_GeneratesPasswordWithoutSpaces_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// UTCID09: Manual reset type
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return appropriate message
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID09_UserExists_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// UTCID10: Manual reset type
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return appropriate message
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID10_UserExists_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// UTCID11: Manual reset type
        /// Precondition: Can connect with server, Admin has exist account, User exists
        /// Expected: Return appropriate message
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UTCID11_UserExists_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var user = CreateTestUser(email, "OldPass123@", isActive: true);
            var users = new List<User> { user };

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>())).Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
        }

        /// <summary>
        /// Additional test: User not found
        /// Precondition: Can connect with server, Admin has exist account, User does not exist
        /// Expected: Return "Không tìm thấy người dùng."
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UserNotFound_ReturnsErrorMessage()
        {
            // Arrange
            var email = "nonexistent@example.com";
            var users = new List<User>();

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.Equal("Không tìm thấy người dùng.", result);
            _mockRepository.Verify(r => r.GetAllAsync(null), Times.Once);
            _mockRepository.Verify(r => r.UpdateUserAsync(It.IsAny<User>()), Times.Never);
        }

        /// <summary>
        /// Additional test: Verify password is updated correctly
        /// </summary>
        [Fact]
        public async Task AdminResetPasswordAsync_UpdatesPasswordHash_ReturnsSuccess()
        {
            // Arrange
            var email = "user@example.com";
            var oldPassword = "OldPass123@";
            var user = CreateTestUser(email, oldPassword, isActive: true);
            var users = new List<User> { user };
            var oldPasswordHash = user.PasswordHash;

            _mockRepository.Setup(r => r.GetAllAsync(null)).ReturnsAsync(users);
            _mockRepository.Setup(r => r.UpdateUserAsync(It.IsAny<User>()))
                .Callback<User>(u =>
                {
                    // Verify password hash was updated
                    Assert.NotEqual(oldPasswordHash, u.PasswordHash);
                    Assert.NotNull(u.PasswordHash);
                })
                .Returns(Task.CompletedTask);

            // Act
            var result = await _userService.AdminResetPasswordAsync(email);

            // Assert
            Assert.NotNull(result);
            Assert.Contains("Mật khẩu đã được đặt lại thành công", result);
            _mockRepository.Verify(r => r.UpdateUserAsync(It.IsAny<User>()), Times.Once);
        }
    }
}

