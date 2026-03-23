#!/bin/bash

echo ""
echo "=========================================="
echo "  🚀 Трамплин API — Запуск"
echo "=========================================="
echo ""

echo "⏳ Ожидание базы данных..."

# Используем Python для проверки БД
python << 'PYEOF'
import socket
import time
import sys

host = "db"
port = 5432
max_attempts = 30

for attempt in range(max_attempts):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        result = sock.connect_ex((host, port))
        sock.close()
        if result == 0:
            sys.exit(0)  # Успех - выходим с кодом 0
    except Exception:
        pass
    print(f"   Попытка {attempt + 1}/{max_attempts}...")
    time.sleep(1)

sys.exit(1)  # Неудача
PYEOF

if [ $? -eq 0 ]; then
    echo "✅ База данных доступна!"
else
    echo "❌ База данных недоступна, выход"
    exit 1
fi

echo ""
echo "📦 Применение миграций..."
alembic upgrade head && echo "✅ Миграции применены" || echo "⚠️  Миграции: ошибка или уже применены"

echo ""
echo "🌱 Заполнение тестовыми данными..."
python -m app.utils.seed_data 2>/dev/null || echo "   (данные уже существуют)"

echo ""
echo "=========================================="
echo "  ✅ API доступен: http://localhost:8000"
echo "  📖 Документация: http://localhost:8000/docs"
echo "=========================================="
echo ""

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload