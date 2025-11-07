using API_Powered_Hospital_Delivery_Robot.Models.DTOs;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;
using System;
using System.Collections.Generic;

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

    public virtual DbSet<CompartmentCategory> CompartmentCategories { get; set; }

    public virtual DbSet<Destination> Destinations { get; set; }

    public virtual DbSet<DrugCategory> DrugCategories { get; set; }

    public virtual DbSet<Log> Logs { get; set; }

    public virtual DbSet<Map> Maps { get; set; }

    public virtual DbSet<Medicine> Medicines { get; set; }

    public virtual DbSet<Patient> Patients { get; set; }

    public virtual DbSet<PerformanceHistory> PerformanceHistories { get; set; }

    public virtual DbSet<Prescription> Prescriptions { get; set; }

    public virtual DbSet<PrescriptionItem> PrescriptionItems { get; set; }

    public virtual DbSet<Robot> Robots { get; set; }

    public virtual DbSet<RobotCompartment> RobotCompartments { get; set; }

    public virtual DbSet<RobotMaintenanceLog> RobotMaintenanceLogs { get; set; }

    public virtual DbSet<Room> Rooms { get; set; }

    public virtual DbSet<Session> Sessions { get; set; }

    public virtual DbSet<Task> Tasks { get; set; }

    public virtual DbSet<TaskPatientAssignment> TaskPatientAssignments { get; set; }

    public virtual DbSet<TaskStop> TaskStops { get; set; }

    public virtual DbSet<User> Users { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) { }

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

        modelBuilder.Entity<CompartmentCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
        });

        modelBuilder.Entity<Destination>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<DrugCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");
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

        modelBuilder.Entity<Map>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        modelBuilder.Entity<Medicine>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'active'");
            entity.Property(e => e.StockQuantity).HasDefaultValueSql("'0'");

            entity.Property(e => e.Status)
                .HasConversion(
                    v => v.ToString().ToLower(),  // Enum -> string ("active", "expired")
                    v => (MedicineStatus)Enum.Parse(typeof(MedicineStatus), v, true)  // string -> Enum
                );

            entity.HasOne(d => d.Category).WithMany(p => p.Medicines)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_medicine_category");
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Gender).HasDefaultValueSql("'other'");
            entity.Property(e => e.Status).HasDefaultValueSql("'active'");

            entity.HasOne(d => d.Room).WithMany(p => p.Patients)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_patients_rooms");
        });

        modelBuilder.Entity<PerformanceHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Robot).WithMany(p => p.PerformanceHistories).HasConstraintName("fk_perf_robot");
        });

        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");

            entity.HasOne(d => d.Patient).WithMany(p => p.Prescriptions).HasConstraintName("fk_presc_patient");

            entity.HasOne(d => d.Users).WithMany(p => p.Prescriptions)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_presc_users");
        });

        modelBuilder.Entity<PrescriptionItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.HasOne(d => d.Medicine).WithMany(p => p.PrescriptionItems).HasConstraintName("fk_pi_medicine");

            entity.HasOne(d => d.Prescription).WithMany(p => p.PrescriptionItems).HasConstraintName("fk_pi_prescription");
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

            entity.HasOne(d => d.Map).WithMany(p => p.Robots)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_robot_map");
        });

        modelBuilder.Entity<RobotCompartment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.IsActive).HasDefaultValueSql("'1'");
            entity.Property(e => e.Status).HasDefaultValueSql("'locked'");

            entity.HasOne(d => d.Category).WithMany(p => p.RobotCompartments)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_compartment_category");

            entity.HasOne(d => d.Patient).WithMany(p => p.RobotCompartments)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_compartment_patient");

            entity.HasOne(d => d.Robot).WithMany(p => p.RobotCompartments).HasConstraintName("fk_comp_robot");
        });

        modelBuilder.Entity<RobotMaintenanceLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.MaintenanceDate).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Robot).WithMany(p => p.RobotMaintenanceLogs).HasConstraintName("fk_rm_robot2");
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.Map).WithMany(p => p.Rooms)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_rooms_maps");
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
            entity.Property(e => e.Priority).HasDefaultValueSql("'Normal'");
            entity.Property(e => e.Status).HasDefaultValueSql("'pending'");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(d => d.AssignedByNavigation).WithMany(p => p.Tasks)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_tasks_assigned_by");

            entity.HasOne(d => d.Map).WithMany(p => p.Tasks)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_task_map");

            entity.HasOne(d => d.Robot).WithMany(p => p.Tasks).HasConstraintName("fk_tasks_robot");
        });

        modelBuilder.Entity<TaskPatientAssignment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity.HasOne(d => d.Patient).WithMany(p => p.TaskPatientAssignments).HasConstraintName("fk_tpa_patient");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskPatientAssignments).HasConstraintName("fk_tpa_task");
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
