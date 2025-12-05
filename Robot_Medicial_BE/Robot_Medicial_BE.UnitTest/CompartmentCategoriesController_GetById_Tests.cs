using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using Xunit;

namespace Robot_Medicial_BE.UnitTest.Controllers
{
    public class CompartmentCategoriesController_GetById_Tests : IDisposable
    {
        private readonly RobotManagerContext _context;
        private readonly CompartmentCategoriesController _controller;

        public CompartmentCategoriesController_GetById_Tests()
        {
            var options = new DbContextOptionsBuilder<RobotManagerContext>()
                .UseInMemoryDatabase("GetByIdTestDB_" + Guid.NewGuid())
                .Options;

            _context = new RobotManagerContext(options);
            _controller = new CompartmentCategoriesController(_context);

            SeedData();
        }

        private void SeedData()
        {
            _context.CompartmentCategories.Add(new CompartmentCategory { Id = 10, Name = "Thuốc viên", Description = "Dạng viên nén" });
            _context.RobotCompartments.AddRange(
                new RobotCompartment { CategoryId = 10, RobotId = 1 },
                new RobotCompartment { CategoryId = 10, RobotId = 2 },
                new RobotCompartment { CategoryId = 10, RobotId = 3 }
            );
            _context.SaveChanges();
        }

        private string GetMessageFromResult(object? value)
        {
            if (value == null) return string.Empty;
            var type = value.GetType();
            var prop = type.GetProperty("message") ?? type.GetProperty("Message");
            return prop?.GetValue(value)?.ToString() ?? value.ToString() ?? string.Empty;
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_ExistingId_ReturnsCategoryWithCorrectCompartmentCount()
        {
            var result = await _controller.GetById(10);

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            dynamic data = okResult.Value!;
            Assert.Equal(10UL, (ulong)data.Id);
            Assert.Equal("Thuốc viên", (string)data.Name);
            Assert.Equal("Dạng viên nén", (string)data.Description);
            Assert.Equal(3, (int)data.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetById_NonExistingId_ReturnsNotFoundWithCorrectMessage()
        {
            var result = await _controller.GetById(999);

            var notFoundResult = Assert.IsType<NotFoundObjectResult>(result.Result);
            var message = GetMessageFromResult(notFoundResult.Value);
            Assert.Equal("Không tìm thấy danh mục ngăn chứa có Id = 999", message);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}