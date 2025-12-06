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
    public class TasksController_CancelTask_Tests
    {
        private readonly Mock<ITaskService> _mockService;
        private readonly TasksController _controller;
        private readonly ulong _currentUserId = 1;
        private readonly ulong _testTaskId = 100;

        public TasksController_CancelTask_Tests()
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
        public async Task CancelTask_UTCID01_ValidPendingTask_NoReason_ReturnsOk()
        {
            var response = new TaskResponseDto 
            { 
                Id = _testTaskId, 
                Status = "canceled", 
                RobotName = "R01" 
            };
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null)).ReturnsAsync(response);

            var result = await _controller.CancelTask(_testTaskId, null);

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var returnValue = Assert.IsType<TaskResponseDto>(okResult.Value);
            Assert.Equal("canceled", returnValue.Status);
            _mockService.Verify(s => s.CancelTaskAsync(_testTaskId, null), Times.Once);
        }

        [Fact]
        public async Task CancelTask_UTCID02_ValidPendingTask_WithReason_ReturnsOk()
        {
            var reason = "Thay đổi kế hoạch";
            var response = new TaskResponseDto 
            { 
                Id = _testTaskId, 
                Status = "canceled" 
            };
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, reason)).ReturnsAsync(response);

            var result = await _controller.CancelTask(_testTaskId, new CancelTaskDto { Reason = reason });

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var returnValue = Assert.IsType<TaskResponseDto>(okResult.Value);
            Assert.Equal("canceled", returnValue.Status);
            _mockService.Verify(s => s.CancelTaskAsync(_testTaskId, reason), Times.Once);
        }

        [Fact]
        public async Task CancelTask_UTCID03_TaskNotExist_ReturnsNotFound()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ReturnsAsync((TaskResponseDto?)null);

            var result = await _controller.CancelTask(_testTaskId, null);
            var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
            var message = Assert.IsType<string>(notFound.Value);
            Assert.Contains("Không tìm thấy nhiệm vụ", message);
        }

        [Fact]
        public async Task CancelTask_UTCID04_TaskNotExist_ThrowsException_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new InvalidOperationException("Không tìm thấy nhiệm vụ."));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Không tìm thấy nhiệm vụ", message);
        }

        [Fact]
        public async Task CancelTask_UTCID05_TaskAlreadyCanceled_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new InvalidOperationException("Nhiệm vụ đã bị hủy trước đó."));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đã bị hủy trước đó", message);
        }

        [Fact]
        public async Task CancelTask_UTCID06_TaskCompleted_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new InvalidOperationException("Không thể hủy nhiệm vụ đã hoàn thành."));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đã hoàn thành", message);
        }

        [Fact]
        public async Task CancelTask_UTCID07_TaskFailed_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new InvalidOperationException("Nhiệm vụ đã thất bại, không cần hủy."));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đã thất bại", message);
        }

        [Fact]
        public async Task CancelTask_UTCID08_TaskInProgress_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new InvalidOperationException(
                            "Không thể hủy thủ công nhiệm vụ đang ở trạng thái 'in_progress'. " +
                            "Chỉ có thể hủy nhiệm vụ chưa bắt đầu (pending)."));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("in_progress", message);
            Assert.Contains("Chỉ có thể hủy nhiệm vụ chưa bắt đầu", message);
        }

        [Fact]
        public async Task CancelTask_UTCID09_TaskRunning_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new InvalidOperationException(
                            "Không thể hủy thủ công nhiệm vụ đang ở trạng thái 'running'. " +
                            "Chỉ có thể hủy nhiệm vụ chưa bắt đầu (pending)."));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("running", message);
        }

        [Fact]
        public async Task CancelTask_UTCID10_TaskAwaitingHandover_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new InvalidOperationException(
                            "Không thể hủy thủ công nhiệm vụ đang ở trạng thái 'awaiting_handover'. " +
                            "Chỉ có thể hủy nhiệm vụ chưa bắt đầu (pending)."));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("awaiting_handover", message);
        }

        [Fact]
        public async Task CancelTask_UTCID11_UnhandledException_ReturnsBadRequest()
        {
            _mockService.Setup(s => s.CancelTaskAsync(_testTaskId, null))
                        .ThrowsAsync(new Exception("Lỗi hệ thống không xác định"));

            var result = await _controller.CancelTask(_testTaskId, null);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Lỗi hệ thống", message);
        }
    }
}

