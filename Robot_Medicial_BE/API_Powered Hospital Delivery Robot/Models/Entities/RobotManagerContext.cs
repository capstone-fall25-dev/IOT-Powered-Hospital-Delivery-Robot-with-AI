using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Pomelo.EntityFrameworkCore.MySql.Scaffolding.Internal;

namespace API_Powered_Hospital_Delivery_Robot.Models.Entities;

public partial class RobotmanagerContext : DbContext
{
    public RobotmanagerContext()
    {
    }

    public RobotmanagerContext(DbContextOptions<RobotmanagerContext> options)
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

            entity
                .ToTable("alerts")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.PrescriptionItemId, "IX_alerts_prescription_item_id");

            entity.HasIndex(e => e.RobotId, "fk_alert_robot");

            entity.HasIndex(e => e.Category, "idx_alert_category");

            entity.HasIndex(e => e.CreatedAt, "idx_alert_created");

            entity.HasIndex(e => e.Status, "idx_alert_status");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Category)
                .HasColumnType("enum('battery','network','obstacle','system','manual')")
                .HasColumnName("category");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Message)
                .HasMaxLength(500)
                .HasColumnName("message");
            entity.Property(e => e.PrescriptionItemId).HasColumnName("prescription_item_id");
            entity.Property(e => e.ResolvedAt)
                .HasColumnType("datetime")
                .HasColumnName("resolved_at");
            entity.Property(e => e.RobotId).HasColumnName("robot_id");
            entity.Property(e => e.Severity)
                .HasDefaultValueSql("'low'")
                .HasColumnType("enum('low','medium','high','critical')")
                .HasColumnName("severity");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'open'")
                .HasColumnType("enum('open','acknowledged','resolved')")
                .HasColumnName("status");

            entity.HasOne(d => d.PrescriptionItem).WithMany(p => p.Alerts).HasForeignKey(d => d.PrescriptionItemId);

            entity.HasOne(d => d.Robot).WithMany(p => p.Alerts)
                .HasForeignKey(d => d.RobotId)
                .HasConstraintName("fk_alert_robot");
        });

        modelBuilder.Entity<CompartmentAssignment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("compartment_assignments")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CompartmentId, "fk_ca_comp");

            entity.HasIndex(e => e.TaskId, "fk_ca_task");

            entity.HasIndex(e => e.Status, "idx_ca_status");

            entity.HasIndex(e => new { e.StopId, e.CompartmentId }, "uk_stop_comp").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompartmentId).HasColumnName("compartment_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ItemDesc)
                .HasMaxLength(255)
                .HasColumnName("item_desc");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'pending'")
                .HasColumnType("enum('pending','loaded','unlocked','delivered','locked','canceled')")
                .HasColumnName("status");
            entity.Property(e => e.StopId).HasColumnName("stop_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Compartment).WithMany(p => p.CompartmentAssignments)
                .HasForeignKey(d => d.CompartmentId)
                .HasConstraintName("fk_ca_comp");

            entity.HasOne(d => d.Stop).WithMany(p => p.CompartmentAssignments)
                .HasForeignKey(d => d.StopId)
                .HasConstraintName("fk_ca_stop");

            entity.HasOne(d => d.Task).WithMany(p => p.CompartmentAssignments)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("fk_ca_task");
        });

        modelBuilder.Entity<CompartmentCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("compartment_categories")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.Name, "name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.Name)
                .HasMaxLength(128)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Destination>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("destinations")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.Name, "name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Area)
                .HasMaxLength(255)
                .HasColumnName("area");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Floor)
                .HasMaxLength(64)
                .HasColumnName("floor");
            entity.Property(e => e.Name).HasColumnName("name");
        });

        modelBuilder.Entity<DrugCategory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("drug_categories")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.Name, "name").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name)
                .HasMaxLength(128)
                .HasColumnName("name");
        });

        modelBuilder.Entity<Log>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("logs")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.StopId, "fk_log_stop");

            entity.HasIndex(e => e.TaskId, "fk_log_task");

            entity.HasIndex(e => new { e.RobotId, e.CreatedAt }, "idx_logs_robot_time");

            entity.HasIndex(e => e.LogType, "idx_logs_type");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.LogType)
                .HasDefaultValueSql("'info'")
                .HasColumnType("enum('success','warning','error','drive','info','broadcast','mic')")
                .HasColumnName("log_type");
            entity.Property(e => e.Message)
                .HasMaxLength(500)
                .HasColumnName("message");
            entity.Property(e => e.RobotId).HasColumnName("robot_id");
            entity.Property(e => e.StopId).HasColumnName("stop_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");

            entity.HasOne(d => d.Robot).WithMany(p => p.Logs)
                .HasForeignKey(d => d.RobotId)
                .HasConstraintName("fk_log_robot");

            entity.HasOne(d => d.Stop).WithMany(p => p.Logs)
                .HasForeignKey(d => d.StopId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_log_stop");

            entity.HasOne(d => d.Task).WithMany(p => p.Logs)
                .HasForeignKey(d => d.TaskId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_log_task");
        });

        modelBuilder.Entity<Map>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("maps")
                .UseCollation("utf8mb4_unicode_ci");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.FreeThresh).HasColumnName("free_thresh");
            entity.Property(e => e.Height).HasColumnName("height");
            entity.Property(e => e.ImageData).HasColumnName("image_data");
            entity.Property(e => e.ImageName)
                .HasMaxLength(255)
                .HasColumnName("image_name");
            entity.Property(e => e.MapName)
                .HasMaxLength(255)
                .HasColumnName("map_name");
            entity.Property(e => e.Mode)
                .HasMaxLength(50)
                .HasColumnName("mode");
            entity.Property(e => e.Negate).HasColumnName("negate");
            entity.Property(e => e.OccupiedThresh).HasColumnName("occupied_thresh");
            entity.Property(e => e.OriginX).HasColumnName("origin_x");
            entity.Property(e => e.OriginY).HasColumnName("origin_y");
            entity.Property(e => e.OriginZ).HasColumnName("origin_z");
            entity.Property(e => e.Resolution).HasColumnName("resolution");
            entity.Property(e => e.Width).HasColumnName("width");
        });

        modelBuilder.Entity<Medicine>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("medicines")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CategoryId, "fk_medicine_category");

            entity.HasIndex(e => e.MedicineCode, "medicine_code").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(255)
                .HasColumnName("description");
            entity.Property(e => e.ExpiryDate)
                .HasColumnType("datetime")
                .HasColumnName("expiry_date");
            entity.Property(e => e.MedicineCode)
                .HasMaxLength(64)
                .HasColumnName("medicine_code");
            entity.Property(e => e.Name)
                .HasMaxLength(255)
                .HasColumnName("name");
            entity.Property(e => e.Price)
                .HasPrecision(10, 2)
                .HasDefaultValueSql("'0.00'")
                .HasColumnName("price");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'active'")
                .HasColumnType("enum('active','expired')")
                .HasColumnName("status");
            entity.Property(e => e.StockQuantity)
                .HasDefaultValueSql("'0'")
                .HasColumnName("stock_quantity");
            entity.Property(e => e.Unit)
                .HasMaxLength(64)
                .HasColumnName("unit");

            entity.HasOne(d => d.Category).WithMany(p => p.Medicines)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_medicine_category");
        });

        modelBuilder.Entity<Patient>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("patients")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.RoomId, "fk_patients_rooms");

            entity.HasIndex(e => e.PatientCode, "patient_code").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Address)
                .HasMaxLength(255)
                .HasColumnName("address");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Department)
                .HasMaxLength(128)
                .HasColumnName("department");
            entity.Property(e => e.Dob).HasColumnName("dob");
            entity.Property(e => e.FullName)
                .HasMaxLength(128)
                .HasColumnName("full_name");
            entity.Property(e => e.Gender)
                .HasDefaultValueSql("'other'")
                .HasColumnType("enum('male','female','other')")
                .HasColumnName("gender");
            entity.Property(e => e.PatientCode)
                .HasMaxLength(64)
                .HasColumnName("patient_code");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.RoomId).HasColumnName("room_id");
            entity.Property(e => e.RoomNumber)
                .HasMaxLength(64)
                .HasColumnName("room_number");

            entity.HasOne(d => d.Room).WithMany(p => p.Patients)
                .HasForeignKey(d => d.RoomId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_patients_rooms");
        });

        modelBuilder.Entity<PerformanceHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("performance_history")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CompletionDate, "idx_perf_date");

            entity.HasIndex(e => new { e.RobotId, e.CompletionDate }, "idx_perf_robot_date");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CompletionDate)
                .HasColumnType("datetime")
                .HasColumnName("completion_date");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Destinations)
                .HasColumnType("text")
                .HasColumnName("destinations");
            entity.Property(e => e.DurationSeconds).HasColumnName("duration_seconds");
            entity.Property(e => e.ErrorCount).HasColumnName("error_count");
            entity.Property(e => e.RobotId).HasColumnName("robot_id");

            entity.HasOne(d => d.Robot).WithMany(p => p.PerformanceHistories)
                .HasForeignKey(d => d.RobotId)
                .HasConstraintName("fk_perf_robot");
        });

        modelBuilder.Entity<Prescription>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("prescriptions")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.PatientId, "fk_presc_patient");

            entity.HasIndex(e => e.UsersId, "fk_presc_users");

            entity.HasIndex(e => e.PrescriptionCode, "prescription_code").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.PatientId).HasColumnName("patient_id");
            entity.Property(e => e.PrescriptionCode)
                .HasMaxLength(64)
                .HasColumnName("prescription_code");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'pending'")
                .HasColumnType("enum('pending','approved','dispensed','canceled')")
                .HasColumnName("status");
            entity.Property(e => e.UsersId).HasColumnName("users_id");

            entity.HasOne(d => d.Patient).WithMany(p => p.Prescriptions)
                .HasForeignKey(d => d.PatientId)
                .HasConstraintName("fk_presc_patient");

            entity.HasOne(d => d.Users).WithMany(p => p.Prescriptions)
                .HasForeignKey(d => d.UsersId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_presc_users");
        });

        modelBuilder.Entity<PrescriptionItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("prescription_items")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.MedicineId, "fk_pi_medicine");

            entity.HasIndex(e => e.PrescriptionId, "fk_pi_prescription");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Dosage)
                .HasMaxLength(128)
                .HasColumnName("dosage");
            entity.Property(e => e.Instructions)
                .HasMaxLength(255)
                .HasColumnName("instructions");
            entity.Property(e => e.MedicineId).HasColumnName("medicine_id");
            entity.Property(e => e.PrescriptionId).HasColumnName("prescription_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");

            entity.HasOne(d => d.Medicine).WithMany(p => p.PrescriptionItems)
                .HasForeignKey(d => d.MedicineId)
                .HasConstraintName("fk_pi_medicine");

            entity.HasOne(d => d.Prescription).WithMany(p => p.PrescriptionItems)
                .HasForeignKey(d => d.PrescriptionId)
                .HasConstraintName("fk_pi_prescription");
        });

        modelBuilder.Entity<Robot>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("robots")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.Code, "code").IsUnique();

            entity.HasIndex(e => e.MapId, "fk_robot_map");

            entity.HasIndex(e => e.EtaDeliveryAt, "idx_robot_eta_delivery");

            entity.HasIndex(e => e.EtaReturnAt, "idx_robot_eta_return");

            entity.HasIndex(e => e.Status, "idx_robot_status");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.BatteryPercent)
                .HasPrecision(5, 2)
                .HasDefaultValueSql("'100.00'")
                .HasColumnName("battery_percent");
            entity.Property(e => e.Code)
                .HasMaxLength(32)
                .HasColumnName("code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ErrorCountSession).HasColumnName("error_count_session");
            entity.Property(e => e.EtaDeliveryAt)
                .HasColumnType("datetime")
                .HasColumnName("eta_delivery_at");
            entity.Property(e => e.EtaReturnAt)
                .HasColumnType("datetime")
                .HasColumnName("eta_return_at");
            entity.Property(e => e.IsMicOn).HasColumnName("is_mic_on");
            entity.Property(e => e.LastHeartbeatAt)
                .HasColumnType("datetime")
                .HasColumnName("last_heartbeat_at");
            entity.Property(e => e.Latitude)
                .HasPrecision(10, 6)
                .HasColumnName("latitude");
            entity.Property(e => e.Longitude)
                .HasPrecision(10, 6)
                .HasColumnName("longitude");
            entity.Property(e => e.MapId).HasColumnName("map_id");
            entity.Property(e => e.Name)
                .HasMaxLength(128)
                .HasColumnName("name");
            entity.Property(e => e.ProgressLegPct)
                .HasPrecision(5, 2)
                .HasColumnName("progress_leg_pct");
            entity.Property(e => e.ProgressOverallPct)
                .HasPrecision(5, 2)
                .HasColumnName("progress_overall_pct");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'completed'")
                .HasColumnType("enum('transporting','awaiting_handover','returning_to_station','at_station','completed','charging','needs_attention','manual_control','offline')")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Map).WithMany(p => p.Robots)
                .HasForeignKey(d => d.MapId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_robot_map");
        });

        modelBuilder.Entity<RobotCompartment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("robot_compartments")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.CategoryId, "fk_compartment_category");

            entity.HasIndex(e => e.PatientId, "fk_compartment_patient");

            entity.HasIndex(e => e.RobotId, "idx_comp_robot");

            entity.HasIndex(e => new { e.RobotId, e.CompartmentCode }, "uk_robot_compartment").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.CompartmentCode)
                .HasMaxLength(8)
                .HasColumnName("compartment_code");
            entity.Property(e => e.ContentLabel)
                .HasMaxLength(255)
                .HasColumnName("content_label");
            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasColumnName("is_active");
            entity.Property(e => e.PatientId).HasColumnName("patient_id");
            entity.Property(e => e.RobotId).HasColumnName("robot_id");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'locked'")
                .HasColumnType("enum('locked','unlocked')")
                .HasColumnName("status");

            entity.HasOne(d => d.Category).WithMany(p => p.RobotCompartments)
                .HasForeignKey(d => d.CategoryId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_compartment_category");

            entity.HasOne(d => d.Patient).WithMany(p => p.RobotCompartments)
                .HasForeignKey(d => d.PatientId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_compartment_patient");

            entity.HasOne(d => d.Robot).WithMany(p => p.RobotCompartments)
                .HasForeignKey(d => d.RobotId)
                .HasConstraintName("fk_comp_robot");
        });

        modelBuilder.Entity<RobotMaintenanceLog>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("robot_maintenance_logs")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.RobotId, "fk_rm_robot2");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Details)
                .HasColumnType("text")
                .HasColumnName("details");
            entity.Property(e => e.MaintenanceDate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("maintenance_date");
            entity.Property(e => e.RobotId).HasColumnName("robot_id");

            entity.HasOne(d => d.Robot).WithMany(p => p.RobotMaintenanceLogs)
                .HasForeignKey(d => d.RobotId)
                .HasConstraintName("fk_rm_robot2");
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("rooms")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.MapId, "idx_map_id");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Latitude)
                .HasPrecision(10, 7)
                .HasColumnName("latitude");
            entity.Property(e => e.Longitude)
                .HasPrecision(10, 7)
                .HasColumnName("longitude");
            entity.Property(e => e.MapId).HasColumnName("map_id");
            entity.Property(e => e.RoomName)
                .HasMaxLength(128)
                .HasColumnName("room_name");

            entity.HasOne(d => d.Map).WithMany(p => p.Rooms)
                .HasForeignKey(d => d.MapId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_rooms_maps");
        });

        modelBuilder.Entity<Session>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("sessions")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.UserId, "idx_sessions_user");

            entity.HasIndex(e => e.SessionToken, "session_token").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.ExpiresAt)
                .HasColumnType("datetime")
                .HasColumnName("expires_at");
            entity.Property(e => e.IpAddress)
                .HasMaxLength(45)
                .HasColumnName("ip_address");
            entity.Property(e => e.SessionToken)
                .HasMaxLength(64)
                .IsFixedLength()
                .HasColumnName("session_token");
            entity.Property(e => e.UserAgent)
                .HasMaxLength(255)
                .HasColumnName("user_agent");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Sessions)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("fk_sessions_user");
        });

        modelBuilder.Entity<Task>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("tasks")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.MapId, "fk_task_map");

            entity.HasIndex(e => e.AssignedBy, "fk_tasks_assigned_by");

            entity.HasIndex(e => e.RobotId, "idx_task_robot");

            entity.HasIndex(e => e.Status, "idx_task_status");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AssignedBy).HasColumnName("assigned_by");
            entity.Property(e => e.CompletedAt)
                .HasColumnType("datetime")
                .HasColumnName("completed_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.MapId).HasColumnName("map_id");
            entity.Property(e => e.Priority)
                .HasDefaultValueSql("'Normal'")
                .HasColumnType("enum('Normal','Urgent','Critical')")
                .HasColumnName("priority");
            entity.Property(e => e.RobotId).HasColumnName("robot_id");
            entity.Property(e => e.StartedAt)
                .HasColumnType("datetime")
                .HasColumnName("started_at");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'pending'")
                .HasColumnType("enum('pending','in_progress','awaiting_handover','returning','at_station','completed','canceled')")
                .HasColumnName("status");
            entity.Property(e => e.TotalDurationS).HasColumnName("total_duration_s");
            entity.Property(e => e.TotalErrors).HasColumnName("total_errors");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.AssignedByNavigation).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.AssignedBy)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_tasks_assigned_by");

            entity.HasOne(d => d.Map).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.MapId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_task_map");

            entity.HasOne(d => d.Robot).WithMany(p => p.Tasks)
                .HasForeignKey(d => d.RobotId)
                .HasConstraintName("fk_tasks_robot");
        });

        modelBuilder.Entity<TaskPatientAssignment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("task_patient_assignments")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.PatientId, "fk_tpa_patient");

            entity.HasIndex(e => e.TaskId, "fk_tpa_task");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PatientId).HasColumnName("patient_id");
            entity.Property(e => e.TaskId).HasColumnName("task_id");

            entity.HasOne(d => d.Patient).WithMany(p => p.TaskPatientAssignments)
                .HasForeignKey(d => d.PatientId)
                .HasConstraintName("fk_tpa_patient");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskPatientAssignments)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("fk_tpa_task");
        });

        modelBuilder.Entity<TaskStop>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("task_stops")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.DestinationId, "fk_stop_destination");

            entity.HasIndex(e => e.EtaAt, "idx_stop_eta");

            entity.HasIndex(e => e.Status, "idx_stop_status");

            entity.HasIndex(e => new { e.TaskId, e.SeqNo }, "uk_task_seq").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ArrivedAt)
                .HasColumnType("datetime")
                .HasColumnName("arrived_at");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.CustomName)
                .HasMaxLength(255)
                .HasColumnName("custom_name");
            entity.Property(e => e.DestinationId).HasColumnName("destination_id");
            entity.Property(e => e.EtaAt)
                .HasColumnType("datetime")
                .HasColumnName("eta_at");
            entity.Property(e => e.HandedOverAt)
                .HasColumnType("datetime")
                .HasColumnName("handed_over_at");
            entity.Property(e => e.SeqNo).HasColumnName("seq_no");
            entity.Property(e => e.Status)
                .HasDefaultValueSql("'pending'")
                .HasColumnType("enum('pending','in_progress','awaiting_handover','delivered','skipped','failed')")
                .HasColumnName("status");
            entity.Property(e => e.TaskId).HasColumnName("task_id");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Destination).WithMany(p => p.TaskStops)
                .HasForeignKey(d => d.DestinationId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("fk_stop_destination");

            entity.HasOne(d => d.Task).WithMany(p => p.TaskStops)
                .HasForeignKey(d => d.TaskId)
                .HasConstraintName("fk_stop_task");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PRIMARY");

            entity
                .ToTable("users")
                .UseCollation("utf8mb4_unicode_ci");

            entity.HasIndex(e => e.Email, "email").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(64)
                .HasColumnName("email");
            entity.Property(e => e.FullName)
                .HasMaxLength(128)
                .HasColumnName("full_name");
            entity.Property(e => e.IsActive)
                .IsRequired()
                .HasDefaultValueSql("'1'")
                .HasColumnName("is_active");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Role)
                .HasDefaultValueSql("'admin'")
                .HasColumnType("enum('admin','operator')")
                .HasColumnName("role");
            entity.Property(e => e.UpdatedAt)
                .ValueGeneratedOnAddOrUpdate()
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("datetime")
                .HasColumnName("updated_at");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
