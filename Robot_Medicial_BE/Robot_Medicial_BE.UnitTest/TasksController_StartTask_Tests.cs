using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using Xunit;

namespace Robot_Medicial_BE.UnitTest
{
    public class TasksController_StartTask_Tests
    {
        private readonly Mock<ITaskService> _mockService;
        private readonly TasksController _controller;
        private readonly ulong _currentUserId = 1;
        private readonly string _currentUserRole = "admin";
        private readonly ulong _testTaskId = 100;

        public TasksController_StartTask_Tests()
        {
            _mockService = new Mock<ITaskService>();
            _controller = new TasksController(_mockService.Object);
            SetupCurrentUser();
        }

        private void SetupCurrentUser()
        {
            var claims = new List<Claim>
            {
                new Claim("userId", _currentUserId.ToString()),
                new Claim(ClaimTypes.Email, "admin@hospital.com"),
                new Claim(ClaimTypes.Role, "admin")
            };
            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = principal }
            };
        }

        [Fact]
        public async Task StartTask_UTCID01_ValidPendingTask_ReturnsOk()
        {
            var response = new TaskResponseDto 
            { 
                Id = _testTaskId, 
                Status = "in_progress", 
                RobotName = "R01" 
            };
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole)).ReturnsAsync(response);

            var result = await _controller.StartTask(_testTaskId);

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var returnValue = Assert.IsType<TaskResponseDto>(okResult.Value);
            Assert.Equal("in_progress", returnValue.Status);
            _mockService.Verify(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole), Times.Once);
        }

        [Fact]
        public async Task StartTask_UTCID02_TaskNotExist_ReturnsNotFound()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ReturnsAsync((TaskResponseDto?)null);

            var result = await _controller.StartTask(_testTaskId);
            var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
            var message = Assert.IsType<string>(notFound.Value);
            Assert.Contains("Không tìm thấy nhiệm vụ", message);
        }

        [Fact]
        public async Task StartTask_UTCID03_TaskNotExist_ThrowsException_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException("Không tìm thấy nhiệm vụ."));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Không tìm thấy nhiệm vụ", message);
        }

        [Fact]
        public async Task StartTask_UTCID04_TaskNotPending_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException(
                            "Chỉ có thể bắt đầu task ở trạng thái pending. Hiện tại: running"));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Chỉ có thể bắt đầu task ở trạng thái pending", message);
        }

        [Fact]
        public async Task StartTask_UTCID05_TaskStatusCanceled_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException(
                            "Chỉ có thể bắt đầu task ở trạng thái pending. Hiện tại: canceled"));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("canceled", message);
        }

        [Fact]
        public async Task StartTask_UTCID06_TaskStatusCompleted_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException(
                            "Chỉ có thể bắt đầu task ở trạng thái pending. Hiện tại: completed"));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("completed", message);
        }

        [Fact]
        public async Task StartTask_UTCID07_RobotNotExist_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException("Robot không tồn tại."));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Robot không tồn tại", message);
        }

        [Fact]
        public async Task StartTask_UTCID08_RobotNotAtStation_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException(
                            "Robot đang bận (transporting), không thể bắt đầu task."));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang bận", message);
            Assert.Contains("không thể bắt đầu task", message);
        }

        [Fact]
        public async Task StartTask_UTCID09_RobotStatusTransporting_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException(
                            "Robot đang bận (transporting), không thể bắt đầu task."));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("transporting", message);
        }

        [Fact]
        public async Task StartTask_UTCID10_RobotStatusCharging_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new InvalidOperationException(
                            "Robot đang bận (charging), không thể bắt đầu task."));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("charging", message);
        }

        [Fact]
        public async Task StartTask_UTCID11_UnhandledException_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.StartTaskAsync(_testTaskId, _currentUserId, _currentUserRole))
                        .ThrowsAsync(new Exception("Lỗi hệ thống không xác định"));

            var result = await _controller.StartTask(_testTaskId);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Lỗi hệ thống", message);
        }
    }
}

