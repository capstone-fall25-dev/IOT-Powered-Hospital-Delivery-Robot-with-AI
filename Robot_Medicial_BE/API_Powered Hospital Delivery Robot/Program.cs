using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Hubs;
using API_Powered_Hospital_Delivery_Robot.Mapping;
using API_Powered_Hospital_Delivery_Robot.Mappings;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Quartz;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// 1. BASIC SERVICES CONFIGURATION
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 2. DATABASE CONFIGURATION
builder.Services.AddDbContext<RobotManagerContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

// 3. SWAGGER WITH JWT BEARER CONFIGURATION
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "Hospital Delivery Robot API", Version = "v1" });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Nhập JWT token theo dạng: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});

// 4. JWT AUTHENTICATION CONFIGURATION
var jwtSettings = builder.Configuration.GetSection("Jwt");
var secretKey = jwtSettings["Secret"];

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.Zero
    };
});

// 5. CORS CONFIGURATION
builder.Services.AddCors(opts =>
{
    opts.AddPolicy("CORSPolicy", builder =>
    builder.AllowAnyHeader().AllowAnyMethod().AllowCredentials().SetIsOriginAllowed((host) => true).
    WithExposedHeaders("Content-Disposition"));
});

// 6. REPOSITORY REGISTRATION
// User & Authentication
builder.Services.AddScoped<IUserRepository, UserRepository>();

// Robot Management
builder.Services.AddScoped<IRobotRepository, RobotRepository>();
builder.Services.AddScoped<IRobotCompartmentRepository, RobotCompartmentRepository>();
builder.Services.AddScoped<IRobotMaintenanceLogRepository, RobotMaintenanceLogRepository>();
builder.Services.AddScoped<ICompartmentAssignmentRepository, CompartmentAssignmentRepository>();

// Task Management
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ITaskHistoryRepository, TaskHistoryRepository>();

// Map & Navigation
builder.Services.AddScoped<IMapRepository, MapRepository>();
builder.Services.AddScoped<IDestinationRepository, DestinationRepository>();
builder.Services.AddScoped<IRoomRepository, RoomRepository>();

// Medical Management
builder.Services.AddScoped<IPatientRepository, PatientRepository>();
builder.Services.AddScoped<IDrugCategoryRepository, DrugCategoryRepository>();
builder.Services.AddScoped<IMedicineRepository, MedicineRepository>();
builder.Services.AddScoped<IPrescriptionRepository, PrescriptionRepository>();
builder.Services.AddScoped<IPrescriptionItemRepository, PrescriptionItemRepository>();

// Monitoring & Logs
builder.Services.AddScoped<IPerformanceHistoryRepository, PerformanceHistoryRepository>();
builder.Services.AddScoped<ILogRepository, LogRepository>();
builder.Services.AddScoped<IAlertRepository, AlertRepository>();

// 7. HELPER & SESSION CONFIGURATION
builder.Services.AddScoped<EmailHelper>();
builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// 8. SERVICE REGISTRATION
// User & Authentication
builder.Services.AddScoped<IUserService, UserService>();

// Robot Management
builder.Services.AddScoped<IRobotService, RobotService>();
builder.Services.AddScoped<IRobotCompartmentService, RobotCompartmentService>();
builder.Services.AddScoped<IRobotMaintenanceLogService, RobotMaintenanceLogService>();
builder.Services.AddScoped<ICompartmentAssignmentService, CompartmentAssignmentService>();

// Task Management
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<ITaskHistoryService, TaskHistoryService>();

// Map & Navigation
builder.Services.AddScoped<IMapService, MapService>();
builder.Services.AddScoped<IMapUploadService, MapUploadService>();
builder.Services.AddScoped<IDestinationService, DestinationService>();
builder.Services.AddScoped<IRoomService, RoomService>();

// Medical Management
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IMedicineService, MedicineService>();
builder.Services.AddScoped<IPrescriptionService, PrescriptionService>();
builder.Services.AddScoped<IPrescriptionItemService, PrescriptionItemService>();

// Monitoring & Logs
builder.Services.AddScoped<IPerformanceHistoryService, PerformanceHistoryService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddScoped<IAlertService, AlertService>();

// 9. AUTOMAPPER CONFIGURATION
builder.Services.AddAutoMapper(typeof(UserProfile));
builder.Services.AddAutoMapper(typeof(RobotProfile));
builder.Services.AddAutoMapper(typeof(MapProfile));
builder.Services.AddAutoMapper(typeof(TaskProfile));
builder.Services.AddAutoMapper(typeof(CompartmentAssignmentProfile));
builder.Services.AddAutoMapper(typeof(PerformanceHistoryProfile));
builder.Services.AddAutoMapper(typeof(LogAlertProfile));
builder.Services.AddAutoMapper(typeof(MedicalProfile));
builder.Services.AddAutoMapper(typeof(DestinationProfile));
builder.Services.AddAutoMapper(typeof(UserMappingProfile));
builder.Services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());

// 10. SIGNALR CONFIGURATION
builder.Services.AddSignalR();

// 11. BUILD APPLICATION
var app = builder.Build();

// 12. MIDDLEWARE PIPELINE CONFIGURATION
// Swagger (Development only)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS
app.UseCors("CORSPolicy");

// Session
app.UseSession();

// HTTPS Redirection
app.UseHttpsRedirection();

// Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Controllers
app.MapControllers();

// 13. SIGNALR HUB MAPPING
app.MapHub<AlertHub>("/hubs/alert");
app.MapHub<RobotPositionHub>("/hubs/robotposition");
app.MapHub<RobotCameraHub>("/hubs/robotcamera");
app.MapHub<RobotHub>("/hubs/robot");
app.MapHub<TaskHub>("/hubs/task");
app.MapHub<RobotAudioHub>("/hubs/robotaudio");
app.MapHub<TTSHub>("/hubs/ttsHub");

// 14. DATABASE INITIALIZATION & SEED DATA
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<RobotManagerContext>();
    context.Database.EnsureCreated();

    // Seed Admin User
    if (!context.Users.Any(u => u.Email == "admin@hospital.com"))
    {
        string adminPass = Convert.ToBase64String(
            System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes("1"))
        );

        context.Users.Add(new User
        {
            Email = "admin@hospital.com",
            FullName = "Hệ Thống",
            Role = "admin",
            IsActive = true,
            PasswordHash = adminPass,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        context.SaveChanges();
    }
}

// 15. RUN APPLICATION
app.Run();