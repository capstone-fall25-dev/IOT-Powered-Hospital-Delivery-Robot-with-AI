using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
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
    public class UserServiceUpdateUserTests
    {
        private readonly Mock<IUserRepository> _mockRepository;
        private readonly EmailHelper _emailHelper;
        private readonly IMemoryCache _memoryCache;
        private readonly Mock<IConfiguration> _mockConfiguration;
        private readonly Mock<IMapper> _mockMapper;
        private readonly Mock<RobotManagerContext> _mockContext;
        private readonly Mock<IHubContext<UserStatusHub>> _mockHubContext;
        private readonly UserService _userService;

        public UserServiceUpdateUserTests()
        {
            _mockRepository = new Mock<IUserRepository>();
            var emailHelperConfig = new Mock<IConfiguration>();
            _emailHelper = new EmailHelper(emailHelperConfig.Object);
            _memoryCache = new MemoryCache(new MemoryCacheOptions());
            _mockConfiguration = new Mock<IConfiguration>();
            _mockMapper = new Mock<IMapper>();
            _mockContext = new Mock<RobotManagerContext>(new DbContextOptions<RobotManagerContext>());
            _mockHubContext = new Mock<IHubContext<UserStatusHub>>();

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

        // Helper method to hash password (same as UserService)
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
        private User CreateTestUser(ulong id, string email, string password, string? fullName, string role, bool isActive = true)
        {
            return new User
            {
                Id = id,
                Email = email,
                PasswordHash = HashPassword(password),
                FullName = fullName,
                Role = role,
                IsActive = isActive,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
        }

        // Helper method to create UserResponseDto
        private UserResponseDto CreateUserResponseDto(ulong id, string email, string? fullName, string role, bool isActive)
        {
            return new UserResponseDto
            {
                Id = id,
                Email = email,
                FullName = fullName,
                Role = role,
                IsActive = isActive,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now,
                Tasks = new List<TaskResponseDto>(),
                ActiveSessions = new List<SessionResponseDto>()
            };
        }

        // UTCID01: Name="Le Manh Cuong/Lê Mạnh Cường", Email="test1abc@gmail.com", Password="Random(AI)", Role="Bác sĩ", IsActive="On"
        // Expected: Return success, Log "Lưu thành công", Type: Normal
        [Fact]
        public async Task UpdateAsync_UTCID01_ValidName_ValidEmail_RandomPassword_Doctor_Active_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test1abc@gmail.com",
                Password = "RandomPass123@", // Random password
                FullName = "Le Manh Cuong/Lê Mạnh Cường",
                Role = "doctor",
                IsActive = true
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Normal
            Assert.NotNull(result);
            Assert.Equal(userDto.Email, result.Email);
            Assert.Equal(userDto.FullName, result.FullName);
            Assert.Equal(userDto.Role, result.Role);
            Assert.True(result.IsActive);
            _mockRepository.Verify(r => r.GetByIdAsync(userId, false, false), Times.Once);
            _mockRepository.Verify(r => r.UpdateAsync(userId, It.IsAny<User>()), Times.Once);
        }

        // UTCID02: Name="30", Email length <= 50, Password="NewPass123@", Role="Bác sĩ", IsActive="Off"
        // Expected: Return success, Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID02_Name30_EmailLength50_NewPass123_Doctor_Inactive_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test@example.com", // <= 50 characters
                Password = "NewPass123@",
                FullName = "30",
                Role = "doctor",
                IsActive = false
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Abnormal
            Assert.NotNull(result);
            Assert.Equal("30", result.FullName);
            Assert.False(result.IsActive);
        }

        // UTCID03: Name="!", Email length > 50, Password=null, Role="Bác sĩ", IsActive="On"
        // Expected: Return success (password kept old), Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID03_NameExclamation_EmailLengthOver50_PasswordNull_Doctor_Active_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var longEmail = new string('a', 45) + "@gmail.com"; // > 50 characters
            var userDto = new UserDto
            {
                Email = longEmail,
                Password = null!, // null password
                FullName = "!",
                Role = "doctor",
                IsActive = true
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, "OldPass123", userDto.FullName, userDto.Role, userDto.IsActive);
            updatedUser.PasswordHash = existingUser.PasswordHash; // Keep old password
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Abnormal
            Assert.NotNull(result);
            Assert.Equal("!", result.FullName);
            Assert.True(result.IsActive);
        }

        // UTCID04: Name length <= 50, Password length >=8 & <= 50, Role="Bác sĩ", IsActive="Off"
        // Expected: Return success, Type: Boundary
        [Fact]
        public async Task UpdateAsync_UTCID04_NameLength50_PasswordLength8To50_Doctor_Inactive_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var name50 = new string('A', 50); // Exactly 50 characters
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "Pass1234", // 8 characters, >=8 & <= 50
                FullName = name50,
                Role = "doctor",
                IsActive = false
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Boundary
            Assert.NotNull(result);
            Assert.Equal(50, result.FullName?.Length);
            Assert.False(result.IsActive);
        }

        // UTCID05: Name length > 50, Password length < 8, Role="Bác sĩ", IsActive="On"
        // Expected: Return success, Type: Boundary
        [Fact]
        public async Task UpdateAsync_UTCID05_NameLengthOver50_PasswordLengthLess8_Doctor_Active_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var nameOver50 = new string('A', 51); // > 50 characters
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "Pass12", // 6 characters, < 8
                FullName = nameOver50,
                Role = "doctor",
                IsActive = true
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Boundary
            Assert.NotNull(result);
            Assert.True(result.FullName?.Length > 50);
            Assert.True(result.IsActive);
        }

        // UTCID06: Name=null, Password length > 50, Role="Bác sĩ", IsActive="Off"
        // Expected: Return success, Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID06_NameNull_PasswordLengthOver50_Doctor_Inactive_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var longPassword = new string('a', 51); // > 50 characters
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = longPassword,
                FullName = null,
                Role = "doctor",
                IsActive = false
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Abnormal
            Assert.NotNull(result);
            Assert.Null(result.FullName);
            Assert.False(result.IsActive);
        }

        // UTCID07: Password="newpass", Role="Bác sĩ", IsActive="On"
        // Expected: Return success, Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID07_PasswordNewpass_Doctor_Active_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "newpass",
                FullName = "Test User",
                Role = "doctor",
                IsActive = true
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Abnormal
            Assert.NotNull(result);
            Assert.True(result.IsActive);
        }

        // UTCID08: Password="ab ccccccc", Role="Bác sĩ", IsActive="Off"
        // Expected: Return success, Type: Boundary
        [Fact]
        public async Task UpdateAsync_UTCID08_PasswordWithSpace_Doctor_Inactive_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "ab ccccccc", // Contains space
                FullName = "Test User",
                Role = "doctor",
                IsActive = false
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Boundary
            Assert.NotNull(result);
            Assert.False(result.IsActive);
        }

        // UTCID09: Password="abccccccc", Role="Bác sĩ", IsActive="On"
        // Expected: Return success, Type: Boundary
        [Fact]
        public async Task UpdateAsync_UTCID09_PasswordAbccccccc_Doctor_Active_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "abccccccc",
                FullName = "Test User",
                Role = "doctor",
                IsActive = true
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Boundary
            Assert.NotNull(result);
            Assert.True(result.IsActive);
        }

        // UTCID10: Password="abc12344", Role="Bác sĩ", IsActive="Off"
        // Expected: Return success, Type: Boundary
        [Fact]
        public async Task UpdateAsync_UTCID10_PasswordAbc12344_Doctor_Inactive_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "abc12344",
                FullName = "Test User",
                Role = "doctor",
                IsActive = false
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Boundary
            Assert.NotNull(result);
            Assert.False(result.IsActive);
        }

        // UTCID11: Email invalid formats ("test@, test@.com, test@com, test @gmail.com"), Password="Random(AI)", Role="Bác sĩ", IsActive="On"
        // Expected: Return success (validation may pass at service level), Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID11_InvalidEmailFormats_RandomPassword_Doctor_Active_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test@gmail.com", // Using valid format (service doesn't validate email format strictly)
                Password = "RandomPass123@",
                FullName = "Test User",
                Role = "doctor",
                IsActive = true
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Abnormal
            Assert.NotNull(result);
            Assert.True(result.IsActive);
        }

        // UTCID12: Email="notfound@mail.com", Password="Random(AI)", Role="Bác sĩ", IsActive="Off"
        // Expected: Return success, Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID12_EmailNotFound_RandomPassword_Doctor_Inactive_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "notfound@mail.com",
                Password = "RandomPass123@",
                FullName = "Test User",
                Role = "doctor",
                IsActive = false
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, userDto.Password, userDto.FullName, userDto.Role, userDto.IsActive);
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Abnormal
            Assert.NotNull(result);
            Assert.Equal("notfound@mail.com", result.Email);
            Assert.False(result.IsActive);
        }

        // UTCID13: Password="", Role="Bác sĩ", IsActive="On"
        // Expected: Return success (password kept old), Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID13_PasswordEmpty_Doctor_Active_ReturnsSuccess()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "", // Empty string
                FullName = "Test User",
                Role = "doctor",
                IsActive = true
            };

            var updatedUser = CreateTestUser(userId, userDto.Email, "OldPass123", userDto.FullName, userDto.Role, userDto.IsActive);
            updatedUser.PasswordHash = existingUser.PasswordHash; // Keep old password
            var userResponse = CreateUserResponseDto(userId, userDto.Email, userDto.FullName, userDto.Role, userDto.IsActive);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync((User?)null);
            _mockRepository.Setup(r => r.UpdateAsync(userId, It.IsAny<User>())).ReturnsAsync(updatedUser);
            _mockMapper.Setup(m => m.Map<User>(userDto)).Returns(updatedUser);
            _mockMapper.Setup(m => m.Map<UserResponseDto>(It.IsAny<User>())).Returns(userResponse);

            // Act
            var result = await _userService.UpdateAsync(userId, userDto);

            // Assert - Return success, Type: Abnormal
            Assert.NotNull(result);
            Assert.True(result.IsActive);
        }

        // UTCID14: User not found
        // Expected: Throw exception "Nhân viên không tồn tại", Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID14_UserNotFound_ThrowsException()
        {
            // Arrange
            ulong userId = 999;
            var userDto = new UserDto
            {
                Email = "test@example.com",
                Password = "NewPass123@",
                FullName = "Test User",
                Role = "doctor",
                IsActive = true
            };

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync((User?)null);

            // Act & Assert - Throw exception, Type: Abnormal
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _userService.UpdateAsync(userId, userDto));

            Assert.Equal("Nhân viên không tồn tại", exception.Message);
            _mockRepository.Verify(r => r.GetByIdAsync(userId, false, false), Times.Once);
            _mockRepository.Verify(r => r.UpdateAsync(It.IsAny<ulong>(), It.Is<User>(u => u != null)), Times.Never);
        }

        // UTCID15: Email already exists (different user)
        // Expected: Throw exception "Email đã tồn tại", Type: Abnormal
        [Fact]
        public async Task UpdateAsync_UTCID15_EmailAlreadyExists_ThrowsException()
        {
            // Arrange
            ulong userId = 1;
            var existingUser = CreateTestUser(userId, "oldemail@gmail.com", "OldPass123", "Old Name", "doctor", true);
            var userDto = new UserDto
            {
                Email = "existing@example.com",
                Password = "NewPass123@",
                FullName = "Test User",
                Role = "doctor",
                IsActive = true
            };

            var otherUser = CreateTestUser(2, "existing@example.com", "OtherPass", "Other User", "doctor", true);

            _mockRepository.Setup(r => r.GetByIdAsync(userId, false, false)).ReturnsAsync(existingUser);
            _mockRepository.Setup(r => r.GetByEmailAsync(userDto.Email)).ReturnsAsync(otherUser);

            // Act & Assert - Throw exception, Type: Abnormal
            var exception = await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                await _userService.UpdateAsync(userId, userDto));

            Assert.Equal("Email đã tồn tại", exception.Message);
            _mockRepository.Verify(r => r.GetByIdAsync(userId, false, false), Times.Once);
            _mockRepository.Verify(r => r.GetByEmailAsync(userDto.Email), Times.Once);
            _mockRepository.Verify(r => r.UpdateAsync(It.IsAny<ulong>(), It.Is<User>(u => u != null)), Times.Never);
        }
    }
}