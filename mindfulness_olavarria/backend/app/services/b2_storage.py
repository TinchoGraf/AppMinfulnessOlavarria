"""
Cliente de Backblaze B2 para almacenar y servir videos de forma privada.

Backblaze B2 expone una API compatible con S3, así que usamos boto3
apuntando al endpoint de B2 en la región del bucket.

El bucket (serenalma-videos) debe ser PRIVADO en Backblaze — nunca público.
El único acceso a los archivos es a través de URLs firmadas de corta duración,
generadas acá y sólo entregadas a usuarios autenticados con suscripción premium.
"""

import boto3
from botocore.client import Config
from app.core.config import settings


def get_b2_client():
    """Crea un cliente S3 (boto3) apuntando al endpoint de Backblaze B2."""
    endpoint_url = f"https://s3.{settings.B2_REGION}.backblazeb2.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.B2_KEY_ID,
        aws_secret_access_key=settings.B2_APPLICATION_KEY,
        config=Config(signature_version="s3v4", region_name=settings.B2_REGION),
    )


def upload_video(file_obj, filename: str, content_type: str = "video/mp4") -> None:
    """Sube un archivo de video al bucket privado de Backblaze B2."""
    client = get_b2_client()
    client.upload_fileobj(
        file_obj,
        settings.B2_BUCKET_NAME,
        filename,
        ExtraArgs={"ContentType": content_type},
    )


def delete_video(filename: str) -> None:
    """Elimina un archivo de video del bucket."""
    client = get_b2_client()
    client.delete_object(Bucket=settings.B2_BUCKET_NAME, Key=filename)


def generate_signed_video_url(filename: str) -> str:
    """
    Genera una URL firmada temporal (expira según B2_VIDEO_URL_EXPIRE_SECONDS)
    para acceder a un video privado del bucket.
    """
    client = get_b2_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.B2_BUCKET_NAME, "Key": filename},
        ExpiresIn=settings.B2_VIDEO_URL_EXPIRE_SECONDS,
    )
