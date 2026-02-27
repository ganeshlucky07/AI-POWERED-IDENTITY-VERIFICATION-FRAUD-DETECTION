import os
import time
import sqlite3
from datetime import datetime
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from models import KYCResponse
from services.ocr_service import extract_id_text
from services.face_service import compare_faces, FACE_MATCH_THRESHOLD
from services.fraud_service import assess_fraud_risk


APP_NAME = "AI KYC Identity Verification API"

app = FastAPI(title=APP_NAME, version="1.0.0")

# Serve static files and templates for the simple web UI
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

# Allow browser access from any origin (safe here because UI is served by same app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# SQLite configuration (Render-friendly and easy for local dev)
DEFAULT_DB_PATH = "kyc.db"
DATABASE_PATH = os.getenv("KYC_DB_PATH", DEFAULT_DB_PATH)


def init_db() -> None:
    """Create the SQLite table to log KYC requests if it does not exist."""
    # If a directory is part of the path, ensure it exists
    db_dir = os.path.dirname(DATABASE_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)

    conn = sqlite3.connect(DATABASE_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS kyc_requests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at TEXT NOT NULL,
                verification_status TEXT NOT NULL,
                face_match_score REAL,
                fraud_risk TEXT NOT NULL,
                reason TEXT,
                extracted_name TEXT,
                extracted_id_number TEXT,
                confidence_score REAL NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                device_os TEXT,
                device_browser TEXT,
                device_type TEXT
            )
            """
        )

        # If the table already existed, ensure the new audit columns are present.
        cursor.execute("PRAGMA table_info(kyc_requests)")
        existing_columns = {row[1] for row in cursor.fetchall()}
        for column_name in ("ip_address", "user_agent", "device_os", "device_browser", "device_type"):
            if column_name not in existing_columns:
                cursor.execute(f"ALTER TABLE kyc_requests ADD COLUMN {column_name} TEXT")

        conn.commit()
    finally:
        conn.close()


def save_kyc_result(
    verification_status: str,
    face_match_score: Optional[float],
    fraud_risk: str,
    reason: Optional[str],
    extracted_name: Optional[str],
    extracted_id_number: Optional[str],
    confidence_score: float,
    ip_address: Optional[str],
    user_agent: Optional[str],
    device_os: Optional[str],
    device_browser: Optional[str],
    device_type: Optional[str],
) -> int:
    """Insert one KYC result row and return its ID."""
    conn = sqlite3.connect(DATABASE_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO kyc_requests (
                created_at,
                verification_status,
                face_match_score,
                fraud_risk,
                reason,
                extracted_name,
                extracted_id_number,
                confidence_score,
                ip_address,
                user_agent,
                device_os,
                device_browser,
                device_type
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                datetime.utcnow().isoformat() + "Z",
                verification_status,
                face_match_score,
                fraud_risk,
                reason,
                extracted_name,
                extracted_id_number,
                confidence_score,
                ip_address,
                user_agent,
                device_os,
                device_browser,
                device_type,
            ),
        )
        conn.commit()
        return int(cursor.lastrowid)
    finally:
        conn.close()


@app.on_event("startup")
def on_startup() -> None:
    """FastAPI startup hook: ensure DB is ready."""
    init_db()


@app.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    """Serve the simple KYC web UI."""
    return templates.TemplateResponse("index.html", {"request": request, "app_name": APP_NAME})


@app.get("/health")
async def health() -> dict:
    """Health check endpoint used by Render and external monitors."""
    return {
        "status": "ok",
        "app": APP_NAME,
        "time": datetime.utcnow().isoformat() + "Z",
    }


def _decode_image(file_bytes: bytes, field_name: str) -> np.ndarray:
    """Convert raw uploaded bytes to an OpenCV BGR image."""
    if not file_bytes:
        raise HTTPException(status_code=400, detail=f"Uploaded file for '{field_name}' is empty.")
    np_array = np.frombuffer(file_bytes, dtype=np.uint8)
    img = cv2.imdecode(np_array, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail=f"Could not decode image bytes for '{field_name}'.")
    return img


def _parse_device_info(user_agent: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    ua = user_agent or ""
    ua_lower = ua.lower()

    device_os: Optional[str]
    if "windows" in ua_lower:
        device_os = "Windows"
    elif "android" in ua_lower:
        device_os = "Android"
    elif "iphone" in ua_lower or "ipad" in ua_lower or "ios" in ua_lower:
        device_os = "iOS"
    elif "mac os x" in ua_lower or "macintosh" in ua_lower:
        device_os = "macOS"
    elif "linux" in ua_lower:
        device_os = "Linux"
    else:
        device_os = None

    if "edg" in ua_lower:
        device_browser = "Edge"
    elif "chrome" in ua_lower and "chromium" not in ua_lower and "edg" not in ua_lower:
        device_browser = "Chrome"
    elif "firefox" in ua_lower:
        device_browser = "Firefox"
    elif "safari" in ua_lower and "chrome" not in ua_lower:
        device_browser = "Safari"
    else:
        device_browser = "Other" if ua else None

    if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
        device_type = "Mobile"
    else:
        device_type = "Desktop"

    return device_os, device_browser, device_type


@app.post("/kyc/verify", response_model=KYCResponse)
async def verify_kyc(
    request: Request,
    id_image: UploadFile = File(..., description="Government ID image (Aadhaar / PAN / Passport)"),
    selfie_image: UploadFile = File(..., description="Live selfie image"),
) -> KYCResponse:
    """Run the full KYC pipeline and return a structured result."""
    start = time.perf_counter()

    if not id_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="id_image must be an image file.")
    if not selfie_image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="selfie_image must be an image file.")

    id_bytes = await id_image.read()
    selfie_bytes = await selfie_image.read()

    id_img = _decode_image(id_bytes, "id_image")
    selfie_img = _decode_image(selfie_bytes, "selfie_image")

    # 1) OCR: extract name and ID number from the document
    extracted_text = extract_id_text(id_img)

    # 2) Face detection & comparison
    face_result = compare_faces(id_img, selfie_img)

    # 3) Fraud risk scoring (uses image quality + simple ML model)
    fraud_result = assess_fraud_risk(
        id_image=id_img,
        selfie_image=selfie_img,
        id_faces_count=face_result.id_faces_count,
        selfie_faces_count=face_result.selfie_faces_count,
    )

    # 4) Decision logic
    verification_status = "REJECTED"
    decision_reason: Optional[str] = None
    fraud_risk = fraud_result.risk_label
    fraud_reasons = list(fraud_result.reasons)

    # Face-based decision is the primary driver of VERIFIED vs REJECTED
    if face_result.error:
        decision_reason = f"Face analysis failed: {face_result.error}"
        fraud_reasons.append("Face match could not be computed.")
    elif face_result.match_score is not None:
        if face_result.match_score >= FACE_MATCH_THRESHOLD:
            verification_status = "VERIFIED"
            decision_reason = "Face on ID matches the live selfie."
        else:
            decision_reason = (
                "Face similarity between ID and selfie images is below the required threshold."
            )
            fraud_reasons.append("Face similarity score is below the acceptance threshold.")
    else:
        decision_reason = "Face similarity score could not be computed."

    # Add information about number of faces without hard-rejecting when there are multiple faces
    if face_result.id_faces_count == 0 or face_result.selfie_faces_count == 0:
        fraud_reasons.append(
            "No face detected in one of the images; please recapture the ID and selfie clearly."
        )
    elif face_result.id_faces_count > 1 or face_result.selfie_faces_count > 1:
        fraud_reasons.append(
            "Multiple faces detected in one of the images; using the most prominent face for verification."
        )

    # Fraud risk impact: do not automatically override a positive face match
    if fraud_risk == "High":
        if verification_status == "VERIFIED":
            fraud_reasons.append(
                "Overall fraud risk evaluated as HIGH based on image quality, but face match passed the threshold."
            )
        else:
            if decision_reason is None:
                decision_reason = "High fraud risk detected based on image quality and content."
            fraud_reasons.append("Overall fraud risk evaluated as HIGH.")

    # Confidence score (heuristic combining face score and fraud risk)
    confidence = 0.3
    if face_result.match_score is not None:
        score = face_result.match_score
        if score >= 90:
            confidence += 0.45
        elif score >= 80:
            confidence += 0.35
        elif score >= 70:
            confidence += 0.25
        elif score >= 50:
            confidence += 0.15
        else:
            confidence -= 0.1

    if fraud_risk == "Low":
        confidence += 0.15
    elif fraud_risk == "Medium":
        confidence -= 0.05
    elif fraud_risk == "High":
        confidence -= 0.2

    # Ensure VERIFIED results have higher confidence than REJECTED ones
    if verification_status == "REJECTED":
        confidence = min(confidence, 0.5)
    else:
        confidence = max(confidence, 0.5)

    confidence = float(min(max(confidence, 0.01), 0.99))

    processing_time_ms = int((time.perf_counter() - start) * 1000)

    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    device_os, device_browser, device_type = _parse_device_info(user_agent)

    # Persist summary to SQLite (best-effort; avoid failing request if DB is unavailable)
    try:
        request_id = save_kyc_result(
            verification_status=verification_status,
            face_match_score=face_result.match_score,
            fraud_risk=fraud_risk,
            reason=decision_reason,
            extracted_name=extracted_text.name,
            extracted_id_number=extracted_text.id_number,
            confidence_score=confidence,
            ip_address=client_ip,
            user_agent=user_agent,
            device_os=device_os,
            device_browser=device_browser,
            device_type=device_type,
        )
    except Exception:
        request_id = None

    return KYCResponse(
        verification_status=verification_status,
        face_match_score=face_result.match_score,
        is_face_match=face_result.is_match,
        fraud_risk=fraud_risk,
        fraud_reasons=fraud_reasons,
        extracted_text=extracted_text,
        confidence_score=confidence,
        government_id_detected=bool(extracted_text.id_number),
        reason=decision_reason,
        request_id=request_id,
        processing_time_ms=processing_time_ms,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=10000, reload=True)
