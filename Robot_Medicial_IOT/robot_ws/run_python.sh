#!/bin/bash

# Lấy thư mục hiện tại
DIR="$(pwd)"

echo "✅ Đang chmod cho tất cả file .py trong: $DIR"

# Chmod tất cả file .py
find "$DIR" -maxdepth 1 -type f -name "*.py" -exec chmod +x {} \;

echo "✅ Chmod xong!"

# Tìm file python chính (file lớn nhất hoặc có main)
MAIN_FILE=$(grep -l "if __name__ == '__main__'" *.py 2>/dev/null | head -n 1)

# Nếu không tìm thấy thì lấy file .py đầu tiên
if [ -z "$MAIN_FILE" ]; then
    MAIN_FILE=$(ls *.py | head -n 1)
fi

echo "🚀 Đang chạy file: $MAIN_FILE"
echo "-----------------------------------"

python3 "$MAIN_FILE"
