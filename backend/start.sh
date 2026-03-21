#!/bin/bash
set -e

echo ""
echo "=========================================="
echo "  🚀 Трамплин API — Запуск"
echo "=========================================="
echo ""

# Ждём готовность PostgreSQL
echo "⏳ Ожидание базы данных..."
MAX_RETRIES=30
RETRY_COUNT=0

while ! python -c "
import asyncio
import asyncpg

async def check():
    try:
        conn = await asyncpg.connect('${DATABASE_URL}'.replace('+asyncpg', '').replace('postgresql+asyncpg', 'postgresql'))
        await conn.close()
        return True
    except:
        return False

result = asyncio.run(check())
exit(0 if result else 1)
" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ База данных недоступна после $MAX_RETRIES попыток"
        exit 1
    fi
    echo "   Попытка $RETRY_COUNT/$MAX_RETRIES..."
    sleep 2
done

echo "✅ База данных доступна!"
echo ""

# Миграции
echo "📦 Применение миграций..."
alembic upgrade head
echo "✅ Миграции применены"
echo ""

# Начальные данные
echo "🌱 Заполнение начальными данными..."
python -m app.utils.seed_data || echo "   (данные уже существуют)"
echo ""

# Запуск сервера
echo "=========================================="
echo "  ✅ API доступен: http://localhost:8000"
echo "  📖 Документация: http://localhost:8000/docs"
echo "=========================================="
echo ""

exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload