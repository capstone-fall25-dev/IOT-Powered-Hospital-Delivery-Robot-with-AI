using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class RobotManagerContext : DbContext
{
    public RobotManagerContext()
    {
    }

    public RobotManagerContext(DbContextOptions<RobotManagerContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Alert> Alerts { get; set; }

    public virtual DbSet<CompartmentAssignment> CompartmentAssignments { get; set; }

    public virtual DbSet<Destination> Destinations { get; set; }

    public virtual DbSet<Log> Logs { get; set; }

    public virtual DbSet<PerformanceHistory> PerformanceHistories { get; set; }

    public virtual DbSet<Robot> Robots { get; set; }

    public virtual DbSet<RobotCompartment> RobotCompartments { get; set; }

    public virtual DbSet<Session> Sessions { get; set; }

    public virtual DbSet<Task> Tasks { get; set; }

    public virtual DbSet<TaskStop> TaskStops { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {

    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .UseCollation("utf8mb4_0900_ai_ci")
            .HasCharSet("utf8mb4");

        modelBuilder.Entity<Alert>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Severity).HasDefaultValueSql("'low'");
            entity.Property(e => e.Status).HasDefaultValueSql("'open'");

            entity.HasOne(d => d.Robot).WithMany(p => p.Alerts).HasConstraintName("fk_alert_robot");
        });

        modelBuilder.Entity<CompartmentAssignment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Compartment).WithMany(p => p.CompartmentAssignments).HasConstraintName("fk_ca_comp");

            entity.HasOne(d => d.Stop).WithMany(p => p.CompartmentAssignments).HasConstraintName("fk_ca_stop");

            entity.HasOne(d => d.Task).WithMany(p => p.CompartmentAssignments).HasConstraintName("fk_ca_task");
        });

        modelBuilder.Entity<Destination>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Log>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.LogType).HasDefaultValueSql("'info'");

            entity.HasOne(d => d.Robot).WithMany(p => p.Logs).HasConstraintName("fk_log_robot");

            entity.HasOne(d => d.Stop).WithMany(p => p.Logs)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_log_stop");

            entity.HasOne(d => d.Task).WithMany(p => p.Logs)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_log_task");
        });

        modelBuilder.Entity<PerformanceHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Robot).WithMany(p => p.PerformanceHistories).HasConstraintName("fk_perf_robot");
        });

        modelBuilder.Entity<Robot>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.BatteryPercent).HasDefaultValueSql("'100.00'");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'completed'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<RobotCompartment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.IsActive).HasDefaultValueSql("'1'");
            entity.Property(e => e.Status).HasDefaultValueSql("'locked'");

            entity.HasOne(d => d.Robot).WithMany(p => p.RobotCompartments).HasConstraintName("fk_comp_robot");
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.SessionToken).IsFixedLength();

            entity.HasOne(d => d.User).WithMany(p => p.Sessions).HasConstraintName("fk_sessions_user");
        });

        modelBuilder.Entity<Task>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.AssignedByNavigation).WithMany(p => p.Tasks)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_tasks_assigned_by");

            entity.HasOne(d => d.Robot).WithMany(p => p.Tasks).HasConstraintName("fk_tasks_robot");
        });

        modelBuilder.Entity<TaskStop>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Destination).WithMany(p => p.TaskStops)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_stop_destination");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskStops).HasConstraintName("fk_stop_task");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.IsActive).HasDefaultValueSql("'1'");
            entity.Property(e => e.Role).HasDefaultValueSql("'admin'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
