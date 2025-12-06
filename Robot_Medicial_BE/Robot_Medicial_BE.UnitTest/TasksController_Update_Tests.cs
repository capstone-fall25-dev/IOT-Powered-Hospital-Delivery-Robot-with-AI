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
    public class TasksController_Update_Tests
    {
        private readonly Mock<ITaskService> _mockService;
        private readonly TasksController _controller;
        private readonly ulong _currentUserId = 1;
        private readonly ulong _testTaskId = 100;

        public TasksController_Update_Tests()
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

        private UpdateTaskDto CreateValidUpdateDto()
        {
            return new UpdateTaskDto
            {
                RobotId = 10,
                MapId = 1,
                Priority = TaskPriority.Normal,
                ScheduledStartAt = DateTime.Now.AddMinutes(15),
                Status = "pending",
                Stops = new List<UpdateTaskStopDto>
                {
                    new() 
                    { 
                        StopId = 1, 
                        SeqNo = 1, 
                        DestinationId = 20, 
                        PatientId = 100, 
                        CompartmentId = 30, 
                        CategoryId = 1,
                        Status = "pending"
                    },
                    new() 
                    { 
                        StopId = 2, 
                        SeqNo = 2, 
                        DestinationId = 21, 
                        PatientId = 101, 
                        CompartmentId = 31, 
                        CategoryId = 2,
                        Status = "pending"
                    }
                }
            };
        }

        private UpdateTaskDto CloneDto(UpdateTaskDto source, Action<UpdateTaskDto> modify)
        {
            var clone = new UpdateTaskDto
            {
                RobotId = source.RobotId,
                MapId = source.MapId,
                Priority = source.Priority,
                ScheduledStartAt = source.ScheduledStartAt,
                Status = source.Status,
                Stops = source.Stops?.Select(s => new UpdateTaskStopDto
                {
                    StopId = s.StopId,
                    SeqNo = s.SeqNo,
                    DestinationId = s.DestinationId,
                    PatientId = s.PatientId,
                    CompartmentId = s.CompartmentId,
                    CategoryId = s.CategoryId,
                    CustomName = s.CustomName,
                    ItemDesc = s.ItemDesc,
                    Status = s.Status
                }).ToList()
            };
            modify(clone);
            return clone;
        }

        [Fact]
        public async Task Update_UTCID01_ValidDto_FullData_ReturnsOk()
        {
            var dto = CreateValidUpdateDto();
            var response = new TaskResponseDto { Id = _testTaskId, Status = "pending", RobotName = "R01" };
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto)).ReturnsAsync(response);

            var result = await _controller.Update(_testTaskId, dto);

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var returnValue = Assert.IsType<TaskResponseDto>(okResult.Value);
            Assert.Equal("pending", returnValue.Status);
            _mockService.Verify(s => s.UpdateAsync(_testTaskId, dto), Times.Once);
        }

        [Fact]
        public async Task Update_UTCID02_TaskNotExist_ReturnsNotFound()
        {
            var dto = CreateValidUpdateDto();
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ReturnsAsync((TaskResponseDto?)null);

            var result = await _controller.Update(_testTaskId, dto);
            var notFound = Assert.IsType<NotFoundObjectResult>(result.Result);
            var message = Assert.IsType<string>(notFound.Value);
            Assert.Contains("Không tìm thấy nhiệm vụ", message);
        }

        [Fact]
        public async Task Update_UTCID03_TaskNotExist_ThrowsException_ReturnsBadRequest()
        {
            var dto = CreateValidUpdateDto();
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Không tìm thấy nhiệm vụ."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Không tìm thấy nhiệm vụ", message);
        }

        [Fact]
        public async Task Update_UTCID04_ChangeRobot_NewRobotNotExist_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.RobotId = 999);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Robot mới không tồn tại."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Robot mới không tồn tại", message);
        }

        [Fact]
        public async Task Update_UTCID05_ChangeRobot_NewRobotNoCompartment_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.RobotId = 20);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Robot 'R02' không có khoang chứa, không thể nhận nhiệm vụ."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("không có khoang chứa", message);
        }

        [Fact]
        public async Task Update_UTCID06_ChangeRobot_NewRobotBusy_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.RobotId = 20);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Robot mới đang bận."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang bận", message);
        }

        [Fact]
        public async Task Update_UTCID07_ChangeMap_MapNotExist_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.MapId = 999);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Bản đồ không tồn tại."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Bản đồ không tồn tại", message);
        }

        [Fact]
        public async Task Update_UTCID08_ChangeMap_CannotAssignMap_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.MapId = 2);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Không thể gán map mới cho robot."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Không thể gán map", message);
        }

        [Fact]
        public async Task Update_UTCID09_RestoreCanceledTask_RobotNotAtStation_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => 
            {
                d.ScheduledStartAt = DateTime.Now.AddMinutes(30);
                d.Status = "pending";
            });
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException(
                            "Không thể restore nhiệm vụ. Robot 'R01' phải ở trạm (at_station) để sử dụng lại nhiệm vụ."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("phải ở trạm", message);
        }

        [Fact]
        public async Task Update_UTCID10_RestoreCanceledTask_ScheduledStartInPast_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => 
            {
                d.ScheduledStartAt = DateTime.Now.AddMinutes(-5);
                d.Status = "pending";
            });
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException(
                            "Thời gian bắt đầu phải lớn hơn thời gian hiện tại ít nhất 1 phút để restore nhiệm vụ."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Thời gian bắt đầu phải lớn hơn", message);
        }

        [Fact]
        public async Task Update_UTCID11_InvalidStatus_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Status = "invalid_status");
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Status 'invalid_status' không hợp lệ."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("không hợp lệ", message);
        }

        [Fact]
        public async Task Update_UTCID12_UpdateStatus_NotAllowedStatus_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Status = "completed");
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException(
                            "Không thể update trạng thái khi task đang ở 'running'."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Không thể update trạng thái", message);
        }

        [Fact]
        public async Task Update_UTCID13_UpdateStop_StopNotExist_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Stops![0].StopId = 999);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Không tìm thấy Stop 999"));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Không tìm thấy Stop", message);
        }

        [Fact]
        public async Task Update_UTCID14_UpdateStop_InvalidStopStatus_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Stops![0].Status = "invalid_stop_status");
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Stop status 'invalid_stop_status' không hợp lệ."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Stop status", message);
            Assert.Contains("không hợp lệ", message);
        }

        [Fact]
        public async Task Update_UTCID15_UpdateStop_CompartmentNotExist_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Stops![0].CompartmentId = 999);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Khoang không tồn tại."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Khoang không tồn tại", message);
        }

        [Fact]
        public async Task Update_UTCID16_UpdateStop_CompartmentLocked_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Stops![0].CompartmentId = 40);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Khoang B2 đang bị khóa. Khoang phải trống để sử dụng lại task."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang bị khóa", message);
        }

        [Fact]
        public async Task Update_UTCID17_UpdateStop_CompartmentBusy_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Stops![0].CompartmentId = 40);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException(
                            "Khoang B2 đang được sử dụng bởi một nhiệm vụ khác."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang được sử dụng", message);
        }

        [Fact]
        public async Task Update_UTCID18_UpdateStop_CategoryMismatch_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => 
            {
                d.Stops![0].CompartmentId = 40;
                d.Stops[0].CategoryId = 3;
            });
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Khoang B2 chỉ hỗ trợ Category 1."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("chỉ hỗ trợ Category", message);
        }

        [Fact]
        public async Task Update_UTCID19_UpdateStop_CompartmentAssignedToDifferentPatient_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => 
            {
                d.Stops![0].CompartmentId = 40;
                d.Stops[0].PatientId = 200;
            });
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Khoang B2 đang gắn bệnh nhân khác."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang gắn bệnh nhân khác", message);
        }

        [Fact]
        public async Task Update_UTCID20_UpdateStop_PatientNotExist_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Stops![0].PatientId = 999);
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new InvalidOperationException("Không tìm thấy bệnh nhân."));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Không tìm thấy bệnh nhân", message);
        }

        [Fact]
        public async Task Update_UTCID21_AddNewStop_Success()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => 
            {
                d.Stops!.Add(new UpdateTaskStopDto
                {
                    StopId = 0, // New stop
                    SeqNo = 3,
                    DestinationId = 22,
                    PatientId = 102,
                    CompartmentId = 32,
                    CategoryId = 1,
                    Status = "pending"
                });
            });
            var response = new TaskResponseDto { Id = _testTaskId, Status = "pending" };
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto)).ReturnsAsync(response);

            var result = await _controller.Update(_testTaskId, dto);
            Assert.IsType<OkObjectResult>(result.Result);
            _mockService.Verify(s => s.UpdateAsync(_testTaskId, dto), Times.Once);
        }

        [Fact]
        public async Task Update_UTCID22_DeleteStop_Success()
        {
            var dto = CloneDto(CreateValidUpdateDto(), d => d.Stops = d.Stops!.Take(1).ToList());
            var response = new TaskResponseDto { Id = _testTaskId, Status = "pending" };
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto)).ReturnsAsync(response);

            var result = await _controller.Update(_testTaskId, dto);
            Assert.IsType<OkObjectResult>(result.Result);
            _mockService.Verify(s => s.UpdateAsync(_testTaskId, dto), Times.Once);
        }

        [Fact]
        public async Task Update_UTCID23_UpdateOnlyPriority_Success()
        {
            var dto = new UpdateTaskDto { Priority = TaskPriority.Urgent };
            var response = new TaskResponseDto { Id = _testTaskId, Priority = TaskPriority.Urgent };
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto)).ReturnsAsync(response);

            var result = await _controller.Update(_testTaskId, dto);
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var returnValue = Assert.IsType<TaskResponseDto>(okResult.Value);
            Assert.Equal(TaskPriority.Urgent, returnValue.Priority);
        }

        [Fact]
        public async Task Update_UTCID24_UpdateOnlyScheduledStart_Success()
        {
            var dto = new UpdateTaskDto { ScheduledStartAt = DateTime.Now.AddMinutes(30) };
            var response = new TaskResponseDto { Id = _testTaskId };
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto)).ReturnsAsync(response);

            var result = await _controller.Update(_testTaskId, dto);
            Assert.IsType<OkObjectResult>(result.Result);
            _mockService.Verify(s => s.UpdateAsync(_testTaskId, dto), Times.Once);
        }

        [Fact]
        public async Task Update_UTCID25_RestoreCanceledTask_Success()
        {
            var dto = new UpdateTaskDto 
            { 
                ScheduledStartAt = DateTime.Now.AddMinutes(30),
                Status = "pending"
            };
            var response = new TaskResponseDto { Id = _testTaskId, Status = "pending" };
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto)).ReturnsAsync(response);

            var result = await _controller.Update(_testTaskId, dto);
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var returnValue = Assert.IsType<TaskResponseDto>(okResult.Value);
            Assert.Equal("pending", returnValue.Status);
        }

        [Fact]
        public async Task Update_UTCID26_UnhandledException_ReturnsBadRequest()
        {
            var dto = CreateValidUpdateDto();
            _mockService.Setup(s => s.UpdateAsync(_testTaskId, dto))
                        .ThrowsAsync(new Exception("Lỗi hệ thống không xác định"));

            var result = await _controller.Update(_testTaskId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Lỗi hệ thống", message);
        }
    }
}

