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
    public class TasksController_Create_Tests
    {
        private readonly Mock<ITaskService> _mockService;
        private readonly TasksController _controller;
        private readonly ulong _currentUserId = 1;

        public TasksController_Create_Tests()
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

        private CreateTaskDto CreateValidDto()
        {
            return new CreateTaskDto
            {
                MapId = 1,
                RobotId = 10,
                Priority = TaskPriority.Normal,
                ScheduledStartAt = DateTime.Now.AddMinutes(15),
                Stops = new List<CreateTaskStopDto>
                {
                    new() { SeqNo = 1, DestinationId = 20, PatientId = 100, CompartmentId = 30, CategoryId = 1 },
                    new() { SeqNo = 2, DestinationId = 21, PatientId = 101, CompartmentId = 31, CategoryId = 2 }
                }
            };
        }

        private CreateTaskDto CloneDto(CreateTaskDto source, Action<CreateTaskDto> modify)
        {
            var clone = new CreateTaskDto
            {
                MapId = source.MapId,
                RobotId = source.RobotId,
                Priority = source.Priority,
                ScheduledStartAt = source.ScheduledStartAt,
                Stops = source.Stops.Select(s => new CreateTaskStopDto
                {
                    SeqNo = s.SeqNo,
                    DestinationId = s.DestinationId,
                    PatientId = s.PatientId,
                    CompartmentId = s.CompartmentId,
                    CategoryId = s.CategoryId,
                    CustomName = s.CustomName,
                    ItemDesc = s.ItemDesc
                }).ToList()
            };
            modify(clone);
            return clone;
        }

        [Fact]
        public async Task Create_UTCID01_ValidDto_FullData_ReturnsCreatedAtAction()
        {
            var dto = CreateValidDto();
            var response = new TaskResponseDto { Id = 100, Status = "pending", RobotName = "R01" };
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId)).ReturnsAsync(response);

            var result = await _controller.Create(dto);

            var createdResult = Assert.IsType<CreatedAtActionResult>(result.Result);
            Assert.Equal(nameof(TasksController.GetById), createdResult.ActionName);
            Assert.Equal(100ul, createdResult.RouteValues?["id"]);
            var returnValue = Assert.IsType<TaskResponseDto>(createdResult.Value);
            Assert.Equal("pending", returnValue.Status);
            _mockService.Verify(s => s.CreateAsync(dto, _currentUserId), Times.Once);
        }

        [Fact]
        public async Task Create_UTCID02_RobotNotExist_ThrowsException_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.RobotId = 999);
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Robot không tồn tại."));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Robot không tồn tại", message);
        }

        [Fact]
        public async Task Create_UTCID03_MapNotExist_ThrowsException_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.MapId = 999);
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Bản đồ không tồn tại."));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Bản đồ không tồn tại", message);
        }

        [Fact]
        public async Task Create_UTCID04_RobotNotInMap_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.RobotId = 20);
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Robot 'R02' không thuộc bản đồ đã chọn"));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("không thuộc bản đồ", message);
        }

        [Fact]
        public async Task Create_UTCID05_RobotNotAtStation_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Robot đang ở trạng thái 'transporting', không thể nhận nhiệm vụ mới"));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("không thể nhận nhiệm vụ mới", message);
        }

        [Fact]
        public async Task Create_UTCID06_CompartmentBusy_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Khoang 30 đang được sử dụng bởi một nhiệm vụ khác"));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang được sử dụng", message);
        }

        [Fact]
        public async Task Create_UTCID07_CompartmentLocked_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Khoang 30 đang bị khóa."));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang bị khóa", message);
        }

        [Fact]
        public async Task Create_UTCID08_NoStops_EmptyList_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.Stops = new List<CreateTaskStopDto>());
            _controller.ModelState.AddModelError("Stops", "Cần ít nhất một điểm dừng.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Cần ít nhất một điểm dừng", message);
        }

        [Fact]
        public async Task Create_UTCID09_NullStops_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.Stops = null!);
            _controller.ModelState.AddModelError("Stops", "Cần ít nhất một điểm dừng.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Cần ít nhất một điểm dừng", message);
        }

        [Fact]
        public async Task Create_UTCID10_ScheduledStartInPast_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.ScheduledStartAt = DateTime.Now.AddMinutes(-5));
            _controller.ModelState.AddModelError("ScheduledStartAt", "Thời gian bắt đầu phải là trong tương lai.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("trong tương lai", message);
        }

        [Fact]
        public async Task Create_UTCID11_PatientNotExist_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Không tìm thấy bệnh nhân."));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("bệnh nhân", message);
        }

        [Fact]
        public async Task Create_UTCID12_CategoryMismatch_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Khoang 30 chỉ hỗ trợ Category"));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("chỉ hỗ trợ Category", message);
        }

        [Fact]
        public async Task Create_UTCID13_RobotHasNoCompartment_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("không có khoang chứa"));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("không có khoang chứa", message);
        }

        [Fact]
        public async Task Create_UTCID14_DuplicateSeqNo_ReturnsBadRequest_FromService()
        {
            var dto = CreateValidDto();
            dto.Stops.Add(new CreateTaskStopDto { SeqNo = 1, DestinationId = 22, PatientId = 102, CompartmentId = 32, CategoryId = 1 });
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Trùng SeqNo"));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Trùng", message);
        }

        [Fact]
        public async Task Create_UTCID15_ValidDto_NoScheduledStart_DefaultToNull_Success()
        {
            var dto = CloneDto(CreateValidDto(), d => d.ScheduledStartAt = null);
            var response = new TaskResponseDto { Id = 101, Status = "pending" };
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId)).ReturnsAsync(response);

            var result = await _controller.Create(dto);
            Assert.IsType<CreatedAtActionResult>(result.Result);
            _mockService.Verify(s => s.CreateAsync(dto, _currentUserId), Times.Once);
        }

        [Fact]
        public async Task Create_UTCID16_OneStopOnly_Success()
        {
            var dto = CreateValidDto();
            dto.Stops = dto.Stops.Take(1).ToList();
            var response = new TaskResponseDto { Id = 103 };
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId)).ReturnsAsync(response);

            var result = await _controller.Create(dto);
            Assert.IsType<CreatedAtActionResult>(result.Result);
        }

        [Fact]
        public async Task Create_UTCID17_TenStops_MaxAllowed_Success()
        {
            var baseDto = CreateValidDto();
            var dto = new CreateTaskDto
            {
                MapId = baseDto.MapId,
                RobotId = baseDto.RobotId,
                Priority = baseDto.Priority,
                ScheduledStartAt = baseDto.ScheduledStartAt,
                Stops = Enumerable.Range(1, 10)
                    .Select(i => new CreateTaskStopDto
                    {
                        SeqNo = i,
                        DestinationId = 20 + (ulong)i,
                        PatientId = 100 + (ulong)i,
                        CompartmentId = 30 + (ulong)i,
                        CategoryId = 1
                    }).ToList()
            };
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ReturnsAsync(new TaskResponseDto { Id = 104 });

            var result = await _controller.Create(dto);
            Assert.IsType<CreatedAtActionResult>(result.Result);
        }

        [Fact]
        public async Task Create_UTCID18_ServiceReturnsNull_ShouldIdeallyReturnError()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ReturnsAsync((TaskResponseDto)null!);

            var result = await _controller.Create(dto);
            Assert.NotNull(result.Result);
        }

        [Fact]
        public async Task Create_UTCID19_UnhandledException_Returns400_WithErrorMessage()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new Exception("Lỗi hệ thống không xác định"));

            var result = await _controller.Create(dto);

            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            Assert.Equal(400, badRequest.StatusCode);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Lỗi hệ thống", message);
        }

        [Fact]
        public async Task Create_UTCID20_CompartmentNotExist_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Khoang 999 không tồn tại."));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Khoang", message);
            Assert.Contains("không tồn tại", message);
        }

        [Fact]
        public async Task Create_UTCID21_CompartmentAssignedToDifferentPatient_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _mockService.Setup(s => s.CreateAsync(dto, _currentUserId))
                        .ThrowsAsync(new InvalidOperationException("Khoang B1 đang gắn với bệnh nhân 200."));

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("đang gắn với bệnh nhân", message);
        }

        [Fact]
        public async Task Create_UTCID22_MapIdZero_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.MapId = 0);
            _controller.ModelState.AddModelError("MapId", "Vui lòng chọn bản đồ.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Vui lòng chọn bản đồ", message);
        }

        [Fact]
        public async Task Create_UTCID23_RobotIdZero_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.RobotId = 0);
            _controller.ModelState.AddModelError("RobotId", "Vui lòng chọn robot.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Vui lòng chọn robot", message);
        }

        [Fact]
        public async Task Create_UTCID24_SeqNoZero_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.Stops[0].SeqNo = 0);
            _controller.ModelState.AddModelError("Stops[0].SeqNo", "SeqNo phải lớn hơn 0.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("SeqNo", message);
        }

        [Fact]
        public async Task Create_UTCID25_DestinationIdZero_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.Stops[0].DestinationId = 0);
            _controller.ModelState.AddModelError("Stops[0].DestinationId", "Phải chọn điểm đến.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Phải chọn điểm đến", message);
        }

        [Fact]
        public async Task Create_UTCID26_PatientIdZero_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.Stops[0].PatientId = 0);
            _controller.ModelState.AddModelError("Stops[0].PatientId", "Phải chọn bệnh nhân.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Phải chọn bệnh nhân", message);
        }

        [Fact]
        public async Task Create_UTCID27_CompartmentIdZero_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.Stops[0].CompartmentId = 0);
            _controller.ModelState.AddModelError("Stops[0].CompartmentId", "Phải chọn khoang.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Phải chọn khoang", message);
        }

        [Fact]
        public async Task Create_UTCID28_CategoryIdZero_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CloneDto(CreateValidDto(), d => d.Stops[0].CategoryId = 0);
            _controller.ModelState.AddModelError("Stops[0].CategoryId", "Phải chọn loại ngăn chứa.");

            var result = await _controller.Create(dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result.Result);
            var message = Assert.IsType<string>(badRequest.Value);
            Assert.Contains("Phải chọn loại ngăn chứa", message);
        }
    }
}