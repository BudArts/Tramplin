#!/bin/bash
set -e

echo "⏳ Ожидание базы данных..."
sleep 3

echo "📦 Применение миграций..."
alembic upgrade head

echo "🌱 Заполнение начальными данными..."
python -m app.utils.seed_data || true

echo "🚀 Запуск сервера..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4