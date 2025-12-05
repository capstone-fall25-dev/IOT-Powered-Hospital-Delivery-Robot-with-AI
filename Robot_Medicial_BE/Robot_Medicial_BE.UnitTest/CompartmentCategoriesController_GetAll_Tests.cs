using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Reflection;
using Xunit;

namespace Robot_Medicial_BE.UnitTest.Controllers
{
    public class CompartmentCategoriesController_GetAll_Tests : IDisposable
    {
        private readonly RobotManagerContext _context;
        private readonly CompartmentCategoriesController _controller;

        public CompartmentCategoriesController_GetAll_Tests()
        {
            var options = new DbContextOptionsBuilder<RobotManagerContext>()
                .UseInMemoryDatabase("GetAllTestDB_" + Guid.NewGuid())
                .Options;

            _context = new RobotManagerContext(options);
            _controller = new CompartmentCategoriesController(_context);

            SeedData();
        }

        private void SeedData()
        {
            _context.CompartmentCategories.AddRange(
                new CompartmentCategory { Id = 1, Name = "Thuốc viên", Description = "Viên nén" },
                new CompartmentCategory { Id = 2, Name = "Thuốc nước", Description = "Siro" },
                new CompartmentCategory { Id = 3, Name = "Bơm kim tiêm", Description = null }
            );

            _context.RobotCompartments.AddRange(
                new RobotCompartment { Id = 1, CategoryId = 1, RobotId = 10 },
                new RobotCompartment { Id = 2, CategoryId = 1, RobotId = 11 },
                new RobotCompartment { Id = 3, CategoryId = 2, RobotId = 10 }
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
        public async System.Threading.Tasks.Task GetAll_ReturnsAllCategories_WithCorrectCompartmentCount_OrderedByName()
        {
            var result = await _controller.GetAll();

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var list = Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);

            var array = list.Cast<dynamic>().ToList();
            Assert.Equal(3, array.Count);

            // Kiểm tra sắp xếp theo tên (alphabet)
            Assert.Equal("Bơm kim tiêm", (string)array[0].Name);
            Assert.Equal("Thuốc nước", (string)array[1].Name);
            Assert.Equal("Thuốc viên", (string)array[2].Name);

            // Kiểm tra đếm số ngăn chứa
            Assert.Equal(0, (int)array[0].CompartmentCount);
            Assert.Equal(1, (int)array[1].CompartmentCount);
            Assert.Equal(2, (int)array[2].CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_EmptyDatabase_ReturnsEmptyList()
        {
            _context.Database.EnsureDeleted();
            _context.Database.EnsureCreated();

            var result = await _controller.GetAll();

            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var list = okResult.Value as IEnumerable<object>;
            Assert.Empty(list!);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
    }
}