from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class ErrorCorrectionLevel(str, Enum):
    L = "L"
    M = "M"
    Q = "Q"
    H = "H"


class OutputFormat(str, Enum):
    png = "png"
    svg = "svg"


class BatchItem(BaseModel):
    id: str = Field(..., min_length=1, max_length=128, pattern=r"^[\w\-\.]+$")
    data: str = Field(..., min_length=1, max_length=4096)


class BatchRequest(BaseModel):
    items: list[BatchItem] = Field(..., min_length=1, max_length=200)
    format: OutputFormat = OutputFormat.png
    size: int = Field(default=400, ge=80, le=4096)
    ecc: ErrorCorrectionLevel = ErrorCorrectionLevel.M
    margin: int = Field(default=4, ge=0, le=100)
    fg: str = Field(default="#000000")
    bg: str = Field(default="#FFFFFF")
    logo: Optional[str] = Field(default=None, max_length=2048)

    @field_validator("fg", "bg")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        if not v.startswith("#") or len(v) not in (4, 7, 9):
            raise ValueError("must be hex color like #RGB, #RRGGBB, or #RRGGBBAA")
        hex_part = v[1:]
        try:
            int(hex_part, 16)
        except ValueError:
            raise ValueError("invalid hex color")
        return v.upper()

    @field_validator("logo")
    @classmethod
    def validate_logo_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not v.startswith(("http://", "https://")):
            raise ValueError("logo must be an http/https URL")
        return v
