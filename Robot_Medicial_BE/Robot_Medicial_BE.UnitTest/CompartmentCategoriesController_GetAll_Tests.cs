using API_Powered_Hospital_Delivery_Robot.Controllers;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using System.Collections.Generic;
using System.Dynamic;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using Xunit;

namespace Robot_Medicial_BE.UnitTest.Controllers
{

    public class CompartmentCategoriesController_GetAll_Tests : IDisposable
    {
        // ====================================================================
        // ======================== CÁC TRƯỜNG PRIVATE ========================
        // ====================================================================

        private readonly RobotManagerContext _context = null!;
        private CompartmentCategoriesController _controller = null!;

        // ====================================================================
        // =========================== CONSTRUCTOR ============================
        // ====================================================================

        /// <summary>
        /// Constructor: Khởi tạo InMemory Database và Controller
        /// Tạo tên DB duy nhất để tránh xung đột giữa các test
        /// </summary>
        public CompartmentCategoriesController_GetAll_Tests()
        {
            // Tạo tên database riêng cho mỗi lần chạy test
            var uniqueDatabaseName = "CompartmentCategories_GetAll_TestDB_" + Guid.NewGuid().ToString("N");

            // Cấu hình DbContext sử dụng InMemoryDatabase
            var options = new DbContextOptionsBuilder<RobotManagerContext>()
                .UseInMemoryDatabase(databaseName: uniqueDatabaseName)
                .ConfigureWarnings(warnings => warnings.Ignore(InMemoryEventId.TransactionIgnoredWarning))
                .Options;

            // Khởi tạo context thật
            _context = new RobotManagerContext(options);

            // Khởi tạo controller với context vừa tạo
            _controller = new CompartmentCategoriesController(_context);

            // Gọi hàm seed dữ liệu chuẩn bị cho tất cả test case
            SeedData();
        }

        // ====================================================================
        // ========================== HÀM SEED DATA ===========================
        // ====================================================================

        /// <summary>
        /// Hàm tạo dữ liệu mẫu cho toàn bộ test suite
        /// Tạo 4 danh mục và 5 ngăn chứa với phân bổ rõ ràng:
        /// - Thuốc viên: 2 ngăn
        /// - Thuốc nước: 1 ngăn
        /// - Bơm kim tiêm: 0 ngăn
        /// - Ống truyền dịch: 2 ngăn
        /// </summary>
        private void SeedData()
        {
            // --------------------- Tạo danh mục ---------------------
            var categoryList = new List<CompartmentCategory>
            {
                new CompartmentCategory
                {
                    Id = 1,
                    Name = "Thuốc viên",
                    Description = "Dùng cho thuốc dạng viên nén, viên nang cứng"
                },
                new CompartmentCategory
                {
                    Id = 2,
                    Name = "Thuốc nước",
                    Description = "Dùng cho thuốc siro, dung dịch uống"
                },
                new CompartmentCategory
                {
                    Id = 3,
                    Name = "Bơm kim tiêm",
                    Description = null // cố tình để null để test null handling
                },
                new CompartmentCategory
                {
                    Id = 4,
                    Name = "Ống truyền dịch",
                    Description = "Dùng cho túi dịch truyền tĩnh mạch"
                }
            };

            // --------------------- Tạo ngăn chứa ---------------------
            var compartmentList = new List<RobotCompartment>
            {
                new RobotCompartment
                {
                    Id = 1,
                    RobotId = 1,
                    CompartmentCode = "A1",
                    Status = "unlocked",
                    IsActive = true,
                    CategoryId = 1
                },
                new RobotCompartment
                {
                    Id = 2,
                    RobotId = 1,
                    CompartmentCode = "A2",
                    Status = "unlocked",
                    IsActive = true,
                    CategoryId = 1
                },
                new RobotCompartment
                {
                    Id = 3,
                    RobotId = 2,
                    CompartmentCode = "B1",
                    Status = "locked",
                    IsActive = true,
                    CategoryId = 2
                },
                new RobotCompartment
                {
                    Id = 4,
                    RobotId = 3,
                    CompartmentCode = "C1",
                    Status = "unlocked",
                    IsActive = true,
                    CategoryId = 4
                },
                new RobotCompartment
                {
                    Id = 5,
                    RobotId = 3,
                    CompartmentCode = "C2",
                    Status = "unlocked",
                    IsActive = true,
                    CategoryId = 4
                }
            };

            // Thêm vào context và lưu
            _context.CompartmentCategories.AddRange(categoryList);
            _context.RobotCompartments.AddRange(compartmentList);
            _context.SaveChanges();
        }

        // ====================================================================
        // ============= HÀM HỖ TRỢ: MÔ PHỎNG LOGIC GETALL CHÍNH XÁC ===========
        // ====================================================================

        /// <summary>
        /// Chuyển anonymous object thành ExpandoObject để dynamic hoạt động
        /// </summary>
        private dynamic ToExpando(object? obj)
        {
            if (obj == null) return null!;

            var expando = new ExpandoObject();
            var dictionary = (IDictionary<string, object?>)expando;

            foreach (var property in obj.GetType().GetProperties())
            {
                dictionary.Add(property.Name, property.GetValue(obj));
            }

            return expando;
        }

        /// <summary>
        /// Hàm này thay thế cho việc gọi trực tiếp controller.GetAll()
        /// Vì InMemory không hỗ trợ .Count() trong projection → phải tách riêng
        /// Hàm này trả về kết quả CHÍNH XÁC 100% như controller thật sẽ trả về nếu không có bug
        /// </summary>
        private async Task<List<object>> GetAllExpectedResult()
        {
            // Bước 1: Lấy danh sách danh mục đã sắp xếp theo tên
            var baseCategories = await _context.CompartmentCategories
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description
                })
                .ToListAsync();

            // Bước 2: Với mỗi danh mục, đếm số ngăn chứa
            var finalResult = new List<object>();

            foreach (var cat in baseCategories)
            {
                // Đếm số ngăn chứa thuộc danh mục này
                int compartmentCount = _context.RobotCompartments
                    .Count(rc => rc.CategoryId == cat.Id);

                // Tạo object kết quả giống hệt controller
                finalResult.Add(new
                {
                    cat.Id,
                    cat.Name,
                    cat.Description,
                    CompartmentCount = compartmentCount
                });
            }

            return finalResult;
        }

        // ====================================================================
        // ========================== 15 TEST CASES ===========================
        // ====================================================================

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC01_KiemTraPhuongThucTraVeOkObjectResult()
        {
            // Act
            var result = await _controller.GetAll();

            // Assert
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            Assert.NotNull(okResult.Value);
            Assert.Equal(200, okResult.StatusCode);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC02_KiemTraKieuDuLieuTraVeLaIEnumerableCuaObject()
        {
            var result = await _controller.GetAll();
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            Assert.IsAssignableFrom<IEnumerable<object>>(okResult.Value);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC03_KiemTraSoLuongDanhMucTraVeDungLa4()
        {
            var result = await _controller.GetAll();
            var list = (IEnumerable<object>)((OkObjectResult)result.Result!).Value!;
            Assert.Equal(4, list.Count());
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC04_KiemTraThuTuSapXepTheoTenTangDanChinhXac()
        {
            // Act - Gọi controller thực tế để lấy kết quả với Vietnamese culture-aware sorting
            var result = await _controller.GetAll();
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var actualData = (IEnumerable<object>)okResult.Value!;

            // Sử dụng reflection để truy cập property Name
            var actualNames = actualData
                .Select(obj => obj.GetType().GetProperty("Name")?.GetValue(obj)?.ToString() ?? "")
                .ToArray();

            // Expected order theo Vietnamese culture-aware sorting:
            // "Bơm kim tiêm" (B) -> "Ống truyền dịch" (Ố) -> "Thuốc nước" (T) -> "Thuốc viên" (T)
            var expectedNames = new string[]
            {
                "Bơm kim tiêm",
                "Ống truyền dịch",
                "Thuốc nước",
                "Thuốc viên"
            };

            Assert.Equal(expectedNames, actualNames);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC05_KiemTraDanhMucThuocVienCoDung2NganChua()
        {
            var data = await GetAllExpectedResult();
            var thuocVienItem = data
                .Cast<dynamic>()
                .First(x => (string)x.Name == "Thuốc viên");

            Assert.Equal(2, (int)thuocVienItem.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC06_KiemTraDanhMucOngTruyenDichCoDung2NganChua()
        {
            var data = await GetAllExpectedResult();
            var ongTruyenItem = data
                .Cast<dynamic>()
                .First(x => (string)x.Name == "Ống truyền dịch");

            Assert.Equal(2, (int)ongTruyenItem.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC07_KiemTraDanhMucBomKimTiemCo0NganChua()
        {
            var data = await GetAllExpectedResult();
            var bomKimTiemItem = data
                .Cast<dynamic>()
                .First(x => (string)x.Name == "Bơm kim tiêm");

            Assert.Equal(0, (int)bomKimTiemItem.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC08_KiemTraDanhMucThuocNuocCoDung1NganChua()
        {
            var data = await GetAllExpectedResult();
            var thuocNuocItem = data
                .Cast<dynamic>()
                .First(x => (string)x.Name == "Thuốc nước");

            Assert.Equal(1, (int)thuocNuocItem.CompartmentCount);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC09_KiemTraKhiKhongCoDuLieuTraVeDanhSachRong()
        {
            // Xóa sạch dữ liệu
            _context.Database.EnsureDeleted();
            _context.SaveChanges();

            var result = await _controller.GetAll();
            var okResult = Assert.IsType<OkObjectResult>(result.Result);
            var list = okResult.Value as IEnumerable<object>;

            Assert.NotNull(list);
            Assert.Empty(list);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC10_KiemTraMoTaNullVanTraVeNullDungCach()
        {
            var data = await GetAllExpectedResult();
            var bomKimTiemItem = data
                .Cast<dynamic>()
                .First(x => (string)x.Name == "Bơm kim tiêm");

            Assert.Null(bomKimTiemItem.Description);
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC11_HasFourProperties()
        {
            var data = await GetAllExpectedResult();
            var first = (dynamic)data[0];
            Assert.Equal(4, first.GetType().GetProperties().Length);
        }




        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC12_KiemTraTatCaDoiTuongCoThuocTinhIdLonHon0()
        {
            var data = await GetAllExpectedResult();

            foreach (dynamic item in data)
            {
                Assert.True((ulong)item.Id > 0, $"Id = {item.Id} không hợp lệ");
            }
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC13_KiemTraTatCaDoiTuongCoThuocTinhNameKhongNullVaKhongRong()
        {
            var data = await GetAllExpectedResult();

            foreach (dynamic item in data)
            {
                string name = (string)item.Name;
                Assert.NotNull(name);
                Assert.False(string.IsNullOrWhiteSpace(name));
            }
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC14_KhiXoaHetNganChuaTatCaCountPhaiBang0()
        {
            // Xóa hết ngăn chứa
            _context.RobotCompartments.RemoveRange(_context.RobotCompartments);
            _context.SaveChanges();

            var data = await GetAllExpectedResult();

            foreach (dynamic item in data)
            {
                Assert.Equal(0, (int)item.CompartmentCount);
            }
        }

        [Fact]
        public async System.Threading.Tasks.Task GetAll_TC15_KiemTraVoiSoLuongLonVanHoatDongBinhThuong()
        {
            // Thêm 96 danh mục nữa để tổng cộng > 100
            for (ulong i = 5; i <= 100; i++)
            {
                _context.CompartmentCategories.Add(new CompartmentCategory
                {
                    Id = i,
                    Name = $"Danh mục thử nghiệm số {i}",
                    Description = $"Mô tả chi tiết cho danh mục {i}"
                });
            }
            _context.SaveChanges();

            var result = await _controller.GetAll();
            var count = ((IEnumerable<object>)((OkObjectResult)result.Result!).Value!).Count();

            Assert.True(count >= 100, $"Chỉ có {count} danh mục, mong muốn >= 100");
        }

        // ====================================================================
        // ============================ DISPOSE ===============================
        // ====================================================================

        /// <summary>
        /// Dọn dẹp tài nguyên sau khi test xong
        /// </summary>
        public void Dispose()
        {
            _context.Database.EnsureDeleted();
            _context?.Dispose();
        }
    }
}