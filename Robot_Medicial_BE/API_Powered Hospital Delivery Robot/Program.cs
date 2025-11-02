using API_Powered_Hospital_Delivery_Robot.Helpers;
using API_Powered_Hospital_Delivery_Robot.Mapping;
using API_Powered_Hospital_Delivery_Robot.Models.Entities;
using API_Powered_Hospital_Delivery_Robot.Repositories.ImplRepository;
using API_Powered_Hospital_Delivery_Robot.Repositories.IRepository;
using API_Powered_Hospital_Delivery_Robot.Services.ImplServices;
using API_Powered_Hospital_Delivery_Robot.Services.IServices;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Quartz;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<RobotManagerContext>(options =>
    options.UseMySql(builder.Configuration.GetConnectionString("DefaultConnection"),
        ServerVersion.AutoDetect(builder.Configuration.GetConnectionString("DefaultConnection"))));

builder.Services.AddCors(opts =>
{
    opts.AddPolicy("CORSPolicy", builder => builder.AllowAnyHeader().AllowAnyMethod().AllowCredentials().SetIsOriginAllowed((host) => true));
});

// Repository
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IRobotRepository, RobotRepository>();
builder.Services.AddScoped<IMapRepository, MapRepository>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<IRobotMaintenanceLogRepository, RobotMaintenanceLogRepository>();
builder.Services.AddScoped<ITaskSchedulerService, TaskSchedulerService>();
builder.Services.AddQuartz(q =>
{
    q.AddJob<TaskSchedulerJob>(j => j.WithIdentity("taskSchedulerJob"));
    q.AddTrigger(t => t
        .ForJob("taskSchedulerJob")
        .WithIdentity("taskSchedulerJob-trigger")
        .WithCronSchedule("0 0 * * * ?"));
});
builder.Services.AddQuartzHostedService(q => q.WaitForJobsToComplete = true);

// Service
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRobotService, RobotService>();
builder.Services.AddScoped<IMapService, MapService>();
builder.Services.AddScoped<ITaskService, TaskService>();
builder.Services.AddScoped<IRobotMaintenanceLogService, RobotMaintenanceLogService>();

// AutoMap
builder.Services.AddAutoMapper(typeof(UserProfile));
builder.Services.AddAutoMapper(typeof(RobotProfile));
builder.Services.AddAutoMapper(typeof(MapProfile));
builder.Services.AddAutoMapper(typeof(TaskProfile));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("CORSPolicy");
app.UseAuthorization();

app.MapControllers();

app.Run();
