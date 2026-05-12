"""
Endpoint para servir archivos de audio con soporte de streaming.
El navegador necesita Range requests para poder reproducir audio
(avanzar, retroceder, etc.) sin descargar el archivo completo.
"""

import os
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from app.core.config import settings

router = APIRouter(prefix="/media", tags=["Media"])


@router.get("/audio/{filename}")
async def serve_audio(filename: str, request: Request):
    """
    Sirve archivos de audio con soporte de Range requests.
    Esto permite al navegador reproducir, avanzar y retroceder el audio.
    """
    # Seguridad: no permitir path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido")

    filepath = os.path.join(settings.MEDIA_DIR, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Audio no encontrado")

    file_size = os.path.getsize(filepath)

    # Detectar tipo de contenido según extensión
    ext = filename.split(".")[-1].lower()
    content_types = {
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "ogg": "audio/ogg",
        "m4a": "audio/mp4",
        "aac": "audio/aac",
    }
    content_type = content_types.get(ext, "audio/mpeg")

    # Leer el header Range del navegador
    range_header = request.headers.get("range")

    if range_header:
        # El navegador pide un rango específico (streaming parcial)
        try:
            range_val = range_header.replace("bytes=", "")
            start_str, end_str = range_val.split("-")
            start = int(start_str)
            end = int(end_str) if end_str else file_size - 1
        except Exception:
            raise HTTPException(status_code=416, detail="Range inválido")

        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def generate_chunk():
            with open(filepath, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    data = f.read(min(8192, remaining))
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": content_type,
        }

        return StreamingResponse(
            generate_chunk(),
            status_code=206,  # Partial Content
            headers=headers,
        )

    else:
        # Sin Range: devolver el archivo completo
        def generate_full():
            with open(filepath, "rb") as f:
                while chunk := f.read(8192):
                    yield chunk

        headers = {
            "Accept-Ranges": "bytes",
            "Content-Length": str(file_size),
            "Content-Type": content_type,
        }

        return StreamingResponse(generate_full(), headers=headers)
