using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Dynamic;
using Xunit;
using Task = System.Threading.Tasks.Task;

namespace Robot_Medicial_BE.UnitTest.Controllers
{
    public class CompartmentCategoriesController_Update_Tests : IDisposable
    {
        private readonly RobotManagerContext _context = null!;
        private CompartmentCategoriesController _controller = null!;
        private readonly ulong _testCategoryId = 1;

        public CompartmentCategoriesController_Update_Tests()
        {
            var uniqueDbName = "Cat_Update_TestDB_" + Guid.NewGuid().ToString("N");
            var options = new DbContextOptionsBuilder<RobotManagerContext>()
                .UseInMemoryDatabase(uniqueDbName)
                .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
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
                new CompartmentCategory { Id = 3, Name = "Bơm kim tiêm", Description = "Kim tiêm vô trùng" }
            );
            _context.SaveChanges();
        }

        private dynamic ToExpando(object? obj)
        {
            if (obj == null) return null!;
            var expando = new ExpandoObject();
            var dict = (IDictionary<string, object?>)expando;
            foreach (var prop in obj.GetType().GetProperties())
                dict.Add(prop.Name, prop.GetValue(obj));
            return expando;
        }

        private string GetMessage(object? value)
            => value?.GetType().GetProperty("message")?.GetValue(value)?.ToString() ?? string.Empty;

        private CompartmentCategoryUpdateDto CreateValidDto()
        {
            return new CompartmentCategoryUpdateDto
            {
                Name = "Thuốc viên cập nhật",
                Description = "Mô tả cập nhật"
            };
        }

        [Fact]
        public async Task Update_UTCID01_ValidDto_FullData_ReturnsOk()
        {
            var dto = CreateValidDto();

            var result = await _controller.Update(_testCategoryId, dto);
            var okResult = Assert.IsType<OkObjectResult>(result);

            dynamic response = ToExpando(okResult.Value);
            Assert.Equal("Cập nhật danh mục thành công.", (string)response.message);
            Assert.NotNull(response.data);
        }

        [Fact]
        public async Task Update_UTCID02_CategoryNotExist_ReturnsNotFound()
        {
            var dto = CreateValidDto();
            var nonExistentId = 999ul;

            var result = await _controller.Update(nonExistentId, dto);
            var notFound = Assert.IsType<NotFoundObjectResult>(result);
            var message = GetMessage(notFound.Value);
            Assert.Contains("Không tìm thấy danh mục", message);
        }

        [Fact]
        public async Task Update_UTCID03_ModelStateInvalid_ReturnsBadRequest()
        {
            var dto = CreateValidDto();
            _controller.ModelState.AddModelError("Name", "Tên danh mục là bắt buộc");

            var result = await _controller.Update(_testCategoryId, dto);
            Assert.IsType<BadRequestObjectResult>(result);
        }

        [Fact]
        public async Task Update_UTCID04_NullName_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = null! };

            var result = await _controller.Update(_testCategoryId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessage(badRequest.Value);
            Assert.Contains("Tên danh mục là bắt buộc", message);
        }

        [Fact]
        public async Task Update_UTCID05_EmptyName_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = "" };

            var result = await _controller.Update(_testCategoryId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessage(badRequest.Value);
            Assert.Contains("Tên danh mục là bắt buộc", message);
        }

        [Fact]
        public async Task Update_UTCID06_WhitespaceOnlyName_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = "   " };

            var result = await _controller.Update(_testCategoryId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessage(badRequest.Value);
            Assert.Contains("không được chỉ chứa khoảng trắng", message);
        }

        [Fact]
        public async Task Update_UTCID07_NameTooShort_LessThan2Chars_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = "A" };

            var result = await _controller.Update(_testCategoryId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessage(badRequest.Value);
            Assert.Contains("2-100 ký tự", message);
        }

        [Fact]
        public async Task Update_UTCID08_NameTooLong_MoreThan100Chars_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = new string('A', 101) };

            var result = await _controller.Update(_testCategoryId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessage(badRequest.Value);
            Assert.Contains("2-100 ký tự", message);
        }

        [Fact]
        public async Task Update_UTCID09_DuplicateName_ReturnsConflict()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = "Thuốc nước" }; // Trùng với ID 2

            var result = await _controller.Update(_testCategoryId, dto);
            var conflict = Assert.IsType<ConflictObjectResult>(result);
            var message = GetMessage(conflict.Value);
            Assert.Contains("đã tồn tại", message);
        }

        [Fact]
        public async Task Update_UTCID10_DescriptionTooLong_MoreThan500Chars_ReturnsBadRequest()
        {
            var dto = new CompartmentCategoryUpdateDto 
            { 
                Name = "Valid Name",
                Description = new string('X', 501)
            };

            var result = await _controller.Update(_testCategoryId, dto);
            var badRequest = Assert.IsType<BadRequestObjectResult>(result);
            var message = GetMessage(badRequest.Value);
            Assert.Contains("không được quá 500 ký tự", message);
        }

        [Fact]
        public async Task Update_UTCID11_NameWithWhitespace_IsTrimmed()
        {
            var dto = new CompartmentCategoryUpdateDto 
            { 
                Name = "  Tên đã trim  ",
                Description = "  Mô tả đã trim  "
            };

            var result = await _controller.Update(_testCategoryId, dto);
            var okResult = Assert.IsType<OkObjectResult>(result);
            dynamic response = ToExpando(okResult.Value);
            dynamic data = ToExpando(response.data);
            
            Assert.Equal("Tên đã trim", (string)data.Name);
            Assert.Equal("Mô tả đã trim", (string)data.Description);
        }

        [Fact]
        public async Task Update_UTCID12_UpdateOnlyName_Success()
        {
            var dto = new CompartmentCategoryUpdateDto 
            { 
                Name = "Chỉ cập nhật tên",
                Description = null
            };

            var result = await _controller.Update(_testCategoryId, dto);
            var okResult = Assert.IsType<OkObjectResult>(result);
            
            var updated = await _context.CompartmentCategories.FindAsync(_testCategoryId);
            Assert.Equal("Chỉ cập nhật tên", updated!.Name);
            Assert.Null(updated.Description);
        }

        [Fact]
        public async Task Update_UTCID13_UpdateOnlyDescription_Success()
        {
            var originalName = (await _context.CompartmentCategories.FindAsync(_testCategoryId))!.Name;
            var dto = new CompartmentCategoryUpdateDto 
            { 
                Name = originalName,
                Description = "Chỉ cập nhật mô tả"
            };

            var result = await _controller.Update(_testCategoryId, dto);
            var okResult = Assert.IsType<OkObjectResult>(result);
            
            var updated = await _context.CompartmentCategories.FindAsync(_testCategoryId);
            Assert.Equal(originalName, updated!.Name);
            Assert.Equal("Chỉ cập nhật mô tả", updated.Description);
        }

        [Fact]
        public async Task Update_UTCID14_Boundary_NameExactly2Chars_Accepted()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = "AB" };

            var result = await _controller.Update(_testCategoryId, dto);
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Update_UTCID15_Boundary_NameExactly100Chars_Accepted()
        {
            var dto = new CompartmentCategoryUpdateDto { Name = new string('A', 100) };

            var result = await _controller.Update(_testCategoryId, dto);
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Update_UTCID16_Boundary_DescriptionExactly500Chars_Accepted()
        {
            var dto = new CompartmentCategoryUpdateDto 
            { 
                Name = "Valid Name",
                Description = new string('X', 500)
            };

            var result = await _controller.Update(_testCategoryId, dto);
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Update_UTCID17_UpdateWithSameName_Success()
        {
            var originalName = (await _context.CompartmentCategories.FindAsync(_testCategoryId))!.Name;
            var dto = new CompartmentCategoryUpdateDto 
            { 
                Name = originalName,
                Description = "Mô tả mới"
            };

            var result = await _controller.Update(_testCategoryId, dto);
            Assert.IsType<OkObjectResult>(result);
        }

        [Fact]
        public async Task Update_UTCID18_CategoryActuallyUpdatedInDb()
        {
            var dto = new CompartmentCategoryUpdateDto 
            { 
                Name = "Đã cập nhật trong DB",
                Description = "Mô tả mới"
            };

            await _controller.Update(_testCategoryId, dto);
            
            var updated = await _context.CompartmentCategories.FindAsync(_testCategoryId);
            Assert.NotNull(updated);
            Assert.Equal("Đã cập nhật trong DB", updated!.Name);
            Assert.Equal("Mô tả mới", updated.Description);
        }

        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context?.Dispose();
        }
    }
}

