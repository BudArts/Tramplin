import re


def validate_inn(inn: str) -> bool:
    """
    Проверка ИНН по формату и контрольным суммам.
    ИНН юрлица — 10 цифр, ИП — 12 цифр.
    """
    if not inn or not inn.isdigit():
        return False

    if len(inn) == 10:
        # ИНН юридического лица
        coefficients = [2, 4, 10, 3, 5, 9, 4, 6, 8]
        check_sum = sum(int(inn[i]) * coefficients[i] for i in range(9))
        return int(inn[9]) == (check_sum % 11) % 10

    elif len(inn) == 12:
        # ИНН ИП / физлица
        coeff_11 = [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
        coeff_12 = [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]
        check_11 = sum(int(inn[i]) * coeff_11[i] for i in range(10))
        check_12 = sum(int(inn[i]) * coeff_12[i] for i in range(11))
        return (
            int(inn[10]) == (check_11 % 11) % 10
            and int(inn[11]) == (check_12 % 11) % 10
        )

    return False


def validate_email(email: str) -> bool:
    """Базовая проверка формата email."""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def get_email_domain(email: str) -> str:
    """Извлечение домена из email."""
    return email.split("@")[-1].lower()


def check_corporate_email(email: str, website: str | None) -> bool:
    """
    Проверка: домен email совпадает с доменом сайта компании.
    hr@yandex.ru + https://yandex.ru → True
    vasya@gmail.com + https://yandex.ru → False
    """
    if not website:
        return False

    email_domain = get_email_domain(email)

    # Убираем протокол и www
    site_domain = website.lower()
    site_domain = re.sub(r'^https?://', '', site_domain)
    site_domain = re.sub(r'^www\.', '', site_domain)
    site_domain = site_domain.split('/')[0]  # убираем путь

    # Проверяем совпадение или вхождение
    return email_domain == site_domain or site_domain.endswith('.' + email_domain)


def calculate_profile_completeness(profile) -> int:
    """
    Расчёт процента заполненности профиля соискателя.
    Каждое заполненное поле добавляет баллы.
    """
    total_fields = 0
    filled_fields = 0

    checks = [
        ("first_name", 10),
        ("last_name", 10),
        ("university", 10),
        ("faculty", 5),
        ("course", 5),
        ("graduation_year", 5),
        ("bio", 15),
        ("portfolio_url", 15),
        ("github_url", 15),
        ("resume_url", 10),
    ]

    max_score = sum(weight for _, weight in checks)

    score = 0
    for field_name, weight in checks:
        value = getattr(profile, field_name, None)
        if value and str(value).strip():
            score += weight

    return min(100, int((score / max_score) * 100))