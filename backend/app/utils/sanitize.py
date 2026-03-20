import re
import html


def sanitize_string(value: str | None) -> str | None:
    """Очистка строки от потенциально опасного содержимого."""
    if value is None:
        return None

    # Экранируем HTML-теги
    value = html.escape(value)

    # Убираем множественные пробелы
    value = re.sub(r'\s+', ' ', value)

    return value.strip()


def sanitize_html_light(value: str | None) -> str | None:
    """
    Для описаний — убираем опасные теги, оставляем безопасные.
    Для MVP достаточно полного экранирования.
    """
    if value is None:
        return None

    # Удаляем script, style, iframe теги с содержимым
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.DOTALL | re.IGNORECASE)
    value = re.sub(r'<style[^>]*>.*?</style>', '', value, flags=re.DOTALL | re.IGNORECASE)
    value = re.sub(r'<iframe[^>]*>.*?</iframe>', '', value, flags=re.DOTALL | re.IGNORECASE)

    # Удаляем on* атрибуты (onclick, onerror и т.д.)
    value = re.sub(r'\s+on\w+\s*=\s*["\'][^"\']*["\']', '', value, flags=re.IGNORECASE)

    # Удаляем javascript: в href
    value = re.sub(r'javascript\s*:', '', value, flags=re.IGNORECASE)

    return value.strip()


def sanitize_url(value: str | None) -> str | None:
    """Проверка URL на безопасность."""
    if value is None:
        return None

    value = value.strip()

    # Разрешаем только http, https
    if not re.match(r'^https?://', value, re.IGNORECASE):
        return None

    # Удаляем javascript:
    if re.search(r'javascript\s*:', value, re.IGNORECASE):
        return None

    return value