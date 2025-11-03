-- ======================
-- USERS
-- ======================
INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
VALUES
(2, 'operator1@hospital.com', '$2y$10$abc123abc123abc123abc123abc123abc123abc123abc123abc12', 'Nguyễn Thị Lan', 'operator', 1, NOW(), NOW()),
(3, 'doctor1@hospital.com', '$2y$10$abc123abc123abc123abc123abc123abc123abc123abc123abc12', 'Bác sĩ Trần Văn Hùng', 'admin', 1, NOW(), NOW());

 -- maps
INSERT INTO maps (id, map_name, image_name, width, height, resolution, origin_x, origin_y, origin_z, mode, negate, occupied_thresh, free_thresh, created_at)
VALUES
(1, 'Bệnh viện tầng 1', 'map_floor1.pgm', 1024, 1024, 0.05, 0, 0, 0, 'trinary', 0, 0.65, 0.2, NOW()),
(2, 'Bệnh viện tầng 2', 'map_floor2.pgm', 1024, 1024, 0.05, 0, 0, 0, 'trinary', 0, 0.65, 0.2, NOW());

-- ======================
-- ROOMS
-- ======================
INSERT INTO rooms (id, room_name, longitude, latitude, map_id, created_at)
VALUES
(1, 'Phòng 101', 105.845001, 21.028000, 1, NOW()),
(2, 'Phòng 202', 105.846001, 21.028500, 1, NOW()),
(3, 'Phòng 303', 105.847001, 21.029000, 1, NOW());

-- ======================
-- PATIENTS
-- ======================
INSERT INTO patients (id, patient_code, full_name, gender, dob, address, phone, department, room_number, room_id, status, created_at)
VALUES
(1, 'BN001', 'Nguyễn Văn A', 'male', '1985-06-12', 'Hà Nội', '0905123456', 'Nội trú', '101', 1, 'active', NOW()),
(2, 'BN002', 'Trần Thị B', 'female', '1990-11-03', 'Hà Nội', '0912345678', 'Nhi khoa', '202', 2, 'active', NOW()),
(3, 'BN003', 'Phạm Văn C', 'male', '1978-09-22', 'Bắc Ninh', '0987654321', 'Ngoại khoa', '303', 3, 'active', NOW());

-- ======================
-- DRUG CATEGORIES
-- ======================
INSERT INTO drug_categories (id, name) VALUES
(1, 'Giảm đau'),
(2, 'Kháng sinh'),
(3, 'Hạ sốt');

-- ======================
-- MEDICINES
-- ======================
INSERT INTO medicines (id, medicine_code, name, unit, stock_quantity, description, category_id, expiry_date, status, created_at)
VALUES
(1, 'MD001', 'Paracetamol 500mg', 'viên', 500, 'Thuốc hạ sốt, giảm đau nhẹ', 3, '2026-01-01', 'active', NOW()),
(2, 'MD002', 'Amoxicillin 500mg', 'viên', 300, 'Kháng sinh phổ rộng', 2, '2025-12-15', 'active', NOW()),
(3, 'MD003', 'Ibuprofen 200mg', 'viên', 200, 'Giảm đau, kháng viêm', 1, '2026-03-01', 'active', NOW());

-- ======================
-- DESTINATIONS
-- ======================
INSERT INTO destinations (id, name, area, floor, created_at)
VALUES
(1, 'Khoa Dược', 'Tầng 1', '1', NOW()),
(2, 'Phòng Nội trú 101', 'Tầng 1', '1', NOW()),
(3, 'Phòng Nhi khoa 202', 'Tầng 2', '2', NOW());

-- ======================
-- PRESCRIPTIONS
-- ======================
INSERT INTO prescriptions (id, prescription_code, patient_id, users_id, status, created_at)
VALUES
(1, 'DT001', 1, 3, 'approved', NOW()),
(2, 'DT002', 2, 3, 'dispensed', NOW());

-- ======================
-- PRESCRIPTION ITEMS
-- ======================
INSERT INTO prescription_items (id, prescription_id, medicine_id, quantity, dosage, instructions)
VALUES
(1, 1, 1, 10, '2 viên/ngày', 'Uống sau bữa ăn'),
(2, 1, 3, 5, '1 viên/ngày', 'Uống sáng'),
(3, 2, 2, 15, '3 viên/ngày', 'Uống trước bữa ăn');

-- ======================
-- ROBOTS
-- ======================
INSERT INTO robots (id, code, name, status, battery_percent, progress_overall_pct, progress_leg_pct, is_mic_on, map_id, created_at)
VALUES
(1, 'RB-01', 'Robot Giao Thuốc 1', 'at_station', 85.00, 0.00, 0.00, 0, 1, NOW()),
(2, 'RB-02', 'Robot Giao Thuốc 2', 'transporting', 60.00, 45.00, 75.00, 0, 1, NOW());

-- ======================
-- COMPARTMENT CATEGORIES
-- ======================
INSERT INTO compartment_categories (id, name, description)
VALUES
(1, 'Thuốc viên', 'Ngăn chứa thuốc dạng viên'),
(2, 'Thuốc nước', 'Ngăn chứa thuốc dạng dung dịch');

-- ======================
-- ROBOT COMPARTMENTS
-- ======================
INSERT INTO robot_compartments (id, robot_id, compartment_code, status, content_label, is_active, patient_id, category_id)
VALUES
(1, 1, 'A1', 'locked', 'Paracetamol', 1, 1, 1),
(2, 1, 'A2', 'locked', 'Ibuprofen', 1, 1, 1),
(3, 2, 'B1', 'unlocked', 'Amoxicillin', 1, 2, 2);

-- ======================
-- TASKS
-- ======================
INSERT INTO tasks (id, robot_id, assigned_by, status, started_at, completed_at, total_duration_s, total_errors, map_id, priority, created_at)
VALUES
(1, 1, 2, 'in_progress', NOW() - INTERVAL 10 MINUTE, NULL, NULL, 0, 1, 'Normal', NOW()),
(2, 2, 2, 'awaiting_handover', NOW() - INTERVAL 30 MINUTE, NULL, NULL, 1, 1, 'Urgent', NOW());

-- ======================
-- TASK STOPS
-- ======================
INSERT INTO task_stops (id, task_id, seq_no, destination_id, custom_name, status, eta_at, arrived_at, created_at)
VALUES
(1, 1, 1, 1, 'Lấy thuốc', 'in_progress', NOW() + INTERVAL 5 MINUTE, NULL, NOW()),
(2, 1, 2, 2, 'Giao cho BN001', 'pending', NULL, NULL, NOW()),
(3, 2, 1, 3, 'Giao cho BN002', 'awaiting_handover', NOW(), NOW() - INTERVAL 1 MINUTE, NOW());

-- ======================
-- COMPARTMENT ASSIGNMENTS
-- ======================
INSERT INTO compartment_assignments (id, task_id, stop_id, compartment_id, item_desc, status, created_at)
VALUES
(1, 1, 1, 1, 'Paracetamol 500mg', 'loaded', NOW()),
(2, 1, 2, 2, 'Ibuprofen 200mg', 'pending', NOW()),
(3, 2, 3, 3, 'Amoxicillin 500mg', 'unlocked', NOW());

-- ======================
-- ALERTS
-- ======================
INSERT INTO alerts (id, robot_id, severity, category, status, message, created_at)
VALUES
(1, 1, 'low', 'battery', 'open', 'Mức pin thấp dưới 20%', NOW()),
(2, 2, 'medium', 'obstacle', 'acknowledged', 'Phát hiện vật cản phía trước', NOW());

-- ======================
-- LOGS
-- ======================
INSERT INTO logs (id, robot_id, task_id, stop_id, log_type, message, created_at)
VALUES
(1, 1, 1, 1, 'info', 'Robot bắt đầu lấy thuốc tại kho', NOW()),
(2, 1, 1, 2, 'drive', 'Di chuyển tới Phòng 101', NOW()),
(3, 2, 2, 3, 'warning', 'Robot tạm dừng do vật cản', NOW());

-- ======================
-- PERFORMANCE HISTORY
-- ======================
INSERT INTO performance_history (id, robot_id, destinations, completion_date, duration_seconds, error_count)
VALUES
(1, 1, 'Khoa Dược -> Phòng 101', NOW() - INTERVAL 1 DAY, 600, 0),
(2, 2, 'Khoa Dược -> Phòng 202', NOW() - INTERVAL 2 DAY, 800, 1);

-- ======================
-- ROBOT MAINTENANCE
-- ======================
INSERT INTO robot_maintenance_logs (id, robot_id, maintenance_date, details)
VALUES
(1, 1, NOW() - INTERVAL 5 DAY, 'Vệ sinh cảm biến, kiểm tra bánh xe.'),
(2, 2, NOW() - INTERVAL 10 DAY, 'Thay pin mới và hiệu chỉnh hệ thống dẫn đường.');
