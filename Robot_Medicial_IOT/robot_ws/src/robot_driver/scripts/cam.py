import cv2

cap = cv2.VideoCapture(2)
if not cap.isOpened():
    exit()



while True:
    # Đọc khung hình từ camera
    ret, frame = cap.read()
    if not ret:
        print("Không nhận được khung hình!")
        break

    # Hiển thị khung hình
    cv2.imshow("Camera", frame)

    # Nhấn phím 'q' để thoát
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Giải phóng tài nguyên
cap.release()