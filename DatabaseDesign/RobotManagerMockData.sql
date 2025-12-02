-- Thêm dữ liệu mẫu cho bảng compartment_categories
INSERT INTO compartment_categories (name, description)
VALUES ('Ngăn thuốc', 'Ngăn dùng để chứa thuốc trong robot.');

-- Thêm dữ liệu mẫu cho bảng drug_categories
INSERT INTO drug_categories (name)
VALUES ('Thuốc điều trị');

-- Thêm dữ liệu mẫu cho bảng rooms
INSERT INTO rooms (room_name, longitude, latitude)
VALUES ('Phòng 101 Khoa Truyền Nhiễm', 105.801, 21.028);

-- Thêm 1 robot trước
INSERT INTO robots (code, name, status, battery_percent, progress_overall_pct, progress_leg_pct, is_mic_on, error_count_session, latitude, longitude)
VALUES ('RB001', 'Robot SEP490_G35', 'at_station', 100.00, 0.00, 0.00, 1, 0, 21.028000, 105.801000);

-- Thêm nhiều dữ liệu mẫu cho bảng robot_compartments (TẤT CẢ UNLOCKED)
INSERT INTO robot_compartments (robot_id, compartment_code, status, content_label, is_active)
VALUES 
(1, 'C001', 'unlocked', 'Paracetamol 500mg', 1),
(1, 'C002', 'unlocked', 'Amoxicillin 250mg', 1),
(1, 'C003', 'unlocked', 'Dụng cụ tiêm truyền', 1),
(1, 'C004', 'unlocked', 'Băng gạc y tế', 1),
(1, 'C005', 'unlocked', 'Thuốc sát trùng', 1),
(1, 'C006', 'unlocked', 'Vitamin C 1000mg', 1);

-- Thêm nhiều dữ liệu mẫu cho bảng patients (TÊN CHUẨN THỰC TẾ)
INSERT INTO patients (patient_code, full_name, gender, dob, address, phone, department, room_number, status)
VALUES
('BN0001', 'Nguyễn Thị Lan Anh', 'female', '1978-03-12', '123 Nguyễn Trãi, Thanh Xuân, Hà Nội', '0901234567', 'Khoa Nội Tim mạch', '101', 'active'),
('BN0002', 'Trần Văn Hùng', 'male', '1985-07-25', '45 Lê Văn Lương, Cầu Giấy, Hà Nội', '0987654321', 'Khoa Phẫu thuật', '102', 'active'),
('BN0003', 'Lê Thị Mai', 'female', '1992-11-08', '78 Phạm Hùng, Nam Từ Liêm, Hà Nội', '0912345678', 'Khoa Nhi', '103', 'active');

-- Thêm dữ liệu mẫu cho bảng medicines
INSERT INTO medicines (medicine_code, name, unit, stock_quantity, description, category_id, status)
VALUES 
('TH001', 'Paracetamol 500mg', 'viên', 150, 'Giảm đau, hạ sốt', 1, 'active'),
('TH002', 'Amoxicillin 250mg', 'viên', 200, 'Kháng sinh phổ rộng', 1, 'active');

-- Thêm dữ liệu mẫu cho bảng robot_maintenance_logs
INSERT INTO robot_maintenance_logs (robot_id, details)
VALUES (1, 'Bảo trì định kỳ tháng 12/2025: Kiểm tra pin, cảm biến laser, bánh xe.');

-- Thêm dữ liệu mẫu cho bảng prescriptions
INSERT INTO prescriptions (prescription_code, patient_id, status)
VALUES 
('PX0001', 1, 'approved'),
('PX0002', 2, 'approved');

-- Thêm dữ liệu mẫu cho bảng prescription_items
INSERT INTO prescription_items (prescription_id, medicine_id, quantity, dosage)
VALUES 
(1, 1, 20, '1 viên x 3 lần/ngày'),
(2, 2, 15, '1 viên x 2 lần/ngày');

-- Thêm dữ liệu mẫu cho bảng alerts
INSERT INTO alerts (robot_id, severity, category, status, message)
VALUES (1, 'medium', 'system', 'open', 'Cảnh báo hệ thống: pin yếu.');
