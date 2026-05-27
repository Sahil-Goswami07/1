"""
rtu_api/config.py

Application settings loaded from environment variables / .env file.
All configurable values live here – nowhere else.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # PostgreSQL
    database_url: str = "postgresql://postgres:password@localhost:5432/rtu_verify"

    # Tesseract – full path to the tesseract.exe on Windows
    tesseract_cmd: str = "tesseract"

    # Poppler – path that contains pdfinfo.exe / pdftoppm.exe on Windows
    # Leave empty string on Linux/macOS where poppler is on PATH
    poppler_path: str = ""

    # Service
    api_port: int = 8000
    debug: bool = False

    # Name matching
    token_similarity_threshold: float = 0.90   # per-token minimum (RapidFuzz ratio)
    name_overall_threshold: float = 0.85        # weighted average of all tokens

    # CGPA validation tolerance
    cgpa_tolerance: float = 0.05               # ±0.05 allowed between computed and extracted

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
