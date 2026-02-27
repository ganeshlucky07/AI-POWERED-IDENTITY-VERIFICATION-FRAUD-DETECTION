from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class ExtractedText(BaseModel):
    """Structured OCR output from the ID document."""

    raw_text: str
    name: Optional[str] = None
    id_number: Optional[str] = None


class FaceCompareResult(BaseModel):
    """Result of face detection and matching between ID image and selfie."""

    id_faces_count: int
    selfie_faces_count: int
    is_match: Optional[bool] = None
    match_score: Optional[float] = None
    error: Optional[str] = None


class FraudAssessment(BaseModel):
    """Aggregated fraud risk assessment for the images."""

    risk_label: Literal["Low", "Medium", "High"]
    reasons: List[str] = Field(default_factory=list)
    blur_score_id: Optional[float] = None
    blur_score_selfie: Optional[float] = None


class KYCResponse(BaseModel):
    """Response model returned by the /kyc/verify endpoint."""

    verification_status: Literal["VERIFIED", "REJECTED"]
    face_match_score: Optional[float] = None
    is_face_match: Optional[bool] = None
    fraud_risk: Literal["Low", "Medium", "High"]
    fraud_reasons: List[str] = Field(default_factory=list)
    extracted_text: ExtractedText
    confidence_score: float
    government_id_detected: bool = False
    reason: Optional[str] = None
    request_id: Optional[int] = None
    processing_time_ms: int
