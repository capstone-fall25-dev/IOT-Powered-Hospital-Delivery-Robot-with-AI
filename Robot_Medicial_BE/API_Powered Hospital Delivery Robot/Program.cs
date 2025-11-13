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
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Quartz;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<RobotManagerContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

//  Swagger + Bearer
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

// JWT Config
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

// CORS
builder.Services.AddCors(opts =>
{
    opts.AddPolicy("CORSPolicy", 
        builder => builder.AllowAnyHeader().
        AllowAnyMethod().
        AllowCredentials().
        SetIsOriginAllowed((host) => true));
});

// Repository
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRobotRepository, RobotRepository>();
builder.Services.AddScoped<IMapRepository, MapRepository>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<ICompartmentAssignmentRepository, CompartmentAssignmentRepository>();
builder.Services.AddScoped<IRobotMaintenanceLogRepository, RobotMaintenanceLogRepository>();
builder.Services.AddScoped<IPerformanceHistoryRepository, PerformanceHistoryRepository>();
builder.Services.AddScoped<ILogRepository, LogRepository>();
builder.Services.AddScoped<IAlertRepository, AlertRepository>();
builder.Services.AddScoped<IPatientRepository, PatientRepository>();
builder.Services.AddScoped<IDrugCategoryRepository, DrugCategoryRepository>();
builder.Services.AddScoped<IMedicineRepository, MedicineRepository>();
builder.Services.AddScoped<IPrescriptionRepository, PrescriptionRepository>();
builder.Services.AddScoped<IPrescriptionItemRepository, PrescriptionItemRepository>();
builder.Services.AddScoped<IRoomRepository, RoomRepository>();
builder.Services.AddScoped<IDestinationRepository, DestinationRepository>();
builder.Services.AddScoped<IMapRepository, MapRepository>();

// Service
builder.Services.AddScoped<EmailHelper>();
builder.Services.AddMemoryCache();
builder.Services.AddDistributedMemoryCache();

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(30);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

builder.Services.AddQuartz(q =>
{
    q.AddJob<TaskSchedulerJob>(j => j.WithIdentity("taskSchedulerJob"));
    q.AddTrigger(t => t
        .ForJob("taskSchedulerJob")
        .WithIdentity("taskSchedulerJob-trigger")
        .WithCronSchedule("0 0 * * * ?"));
});
builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

builder.Services.AddScoped<ITaskSchedulerService, TaskSchedulerService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRobotService, RobotService>();
builder.Services.AddScoped<IMapService, MapService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<ICompartmentAssignmentService, CompartmentAssignmentService>();
builder.Services.AddScoped<IRobotMaintenanceLogService, RobotMaintenanceLogService>();
builder.Services.AddScoped<IPerformanceHistoryService, PerformanceHistoryService>();
builder.Services.AddScoped<ILogService, LogService>();
builder.Services.AddScoped<IAlertService, AlertService>();
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IDrugCategoryService, DrugCategoryService>();
builder.Services.AddScoped<IMedicineService, MedicineService>();
builder.Services.AddScoped<IPrescriptionService, PrescriptionService>();
builder.Services.AddScoped<IPrescriptionItemService, PrescriptionItemService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IDestinationService, DestinationService>();
builder.Services.AddScoped<IMapUploadService, MapUploadService>();
builder.Services.AddScoped<IRobotCompartmentService, RobotCompartmentService>();
builder.Services.AddScoped<IRobotCompartmentRepository, RobotCompartmentRepository>();
// AutoMap
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

// SignalR
builder.Services.AddSignalR();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseSession();
app.UseHttpsRedirection();
app.UseCors("CORSPolicy");

app.UseSession();

app.UseMiddleware<SingleDeviceMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Map Hubs
app.MapHub<AlertHub>("/hubs/alert");
app.MapHub<RobotPositionHub>("/hubs/robotposition");
app.MapHub<RobotCameraHub>("/hubs/robotcamera");
app.MapHub<RobotHub>("/hubs/robot");

app.Run();
