import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.dependencies import get_current_user
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/api/uploads", tags=["Загрузка файлов"])

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_DOC_TYPES = {"application/pdf"}
ALLOWED_ALL = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES

MAX_SIZE = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024  # в байтах


@router.post(
    "/image",
    summary="Загрузить изображение",
)
async def upload_image(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Загрузка изображения (аватар, фото офиса, медиа для вакансии)."""
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Допустимые форматы: JPEG, PNG, WebP, GIF",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Максимальный размер файла: {settings.MAX_UPLOAD_SIZE_MB} МБ",
        )

    # Генерируем уникальное имя
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(settings.UPLOAD_DIR, "images")
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/uploads/images/{filename}"
    return {"url": url, "filename": filename}


@router.post(
    "/document",
    summary="Загрузить документ (резюме PDF)",
)
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
):
    """Загрузка документа (резюме, портфолио)."""
    if file.content_type not in ALLOWED_DOC_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Допустимый формат: PDF",
        )

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Максимальный размер: {settings.MAX_UPLOAD_SIZE_MB} МБ",
        )

    ext = "pdf"
    filename = f"{uuid.uuid4().hex}.{ext}"

    upload_dir = os.path.join(settings.UPLOAD_DIR, "documents")
    os.makedirs(upload_dir, exist_ok=True)

    filepath = os.path.join(upload_dir, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    url = f"/uploads/documents/{filename}"
    return {"url": url, "filename": filename}