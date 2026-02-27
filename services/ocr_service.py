import os
import re
from typing import Optional, Tuple

import cv2
import numpy as np

from models import ExtractedText

try:
    import pytesseract
    from pytesseract import TesseractNotFoundError
except Exception:  # optional dependency
    pytesseract = None  # type: ignore
    TesseractNotFoundError = RuntimeError  # type: ignore


TESSERACT_CMD = os.getenv("TESSERACT_CMD")
if TESSERACT_CMD and pytesseract is not None:
    pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD


def _preprocess_for_ocr(image: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    _, thresh = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU,
    )
    return thresh


def _extract_name_and_id(text: str) -> Tuple[Optional[str], Optional[str]]:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    name: Optional[str] = None
    id_number: Optional[str] = None

    # Normalised versions to make pattern matching more robust against OCR noise
    upper_text = text.upper()
    compact_text = re.sub(r"[\s\-]", "", upper_text)

    # PAN: 5 letters + 4 digits + 1 letter, allow spaces between parts
    pan_pattern = r"[A-Z]{5}\s*[0-9]{4}\s*[A-Z]"
    # Aadhaar: 12 digits, first between 2-9, allow spaces between groups
    aadhaar_pattern = r"\b[2-9][0-9]{3}\s*[0-9]{4}\s*[0-9]{4}\b"
    # Passport (simplified Indian format): one letter [A-PR-WY] + 7 digits
    passport_pattern = r"\b[A-PR-WY][1-9][0-9]{6}\b"
    # Voter ID (EPIC) typical format: 2–3 letters + 7 digits, allow spaces between parts
    voter_pattern = r"\b[A-Z]{2,3}\s*[0-9]{7}\b"

    match = re.search(pan_pattern, upper_text)
    if match:
        # Remove any spaces OCR may have inserted inside the PAN
        id_number = re.sub(r"\s+", "", match.group(0))
    else:
        match = re.search(aadhaar_pattern, text)
        if match:
            # Remove spaces inside Aadhaar number
            id_number = match.group(0).replace(" ", "")
        else:
            # Fallback to compact text for passport (handles occasional spaces/hyphens)
            match = re.search(passport_pattern, compact_text)
            if match:
                id_number = match.group(0)
            else:
                # Voter ID (EPIC)
                match = re.search(voter_pattern, upper_text)
                if match:
                    # Strip internal spaces
                    id_number = re.sub(r"\s+", "", match.group(0))

    blacklist = {
        "government",
        "republic",
        "india",
        "income",
        "tax",
        "department",
        "authority",
        "card",
        "of",
        "ministry",
        "aadhaar",
        "identity",
        "unique",
        "identification",
        "uidai",
        "enrolment",
        "enrollment",
        "resident",
        "address",
        "vid",
    }

    # 1) Prefer a line just above DOB / Date of Birth / Year of Birth markers
    for idx, line in enumerate(lines):
        low = line.lower()
        if "dob" in low or "date of birth" in low or "year of birth" in low:
            for j in range(max(0, idx - 3), idx):
                candidate = lines[j].strip()
                if not candidate:
                    continue
                cand_low = candidate.lower()
                if any(word in cand_low for word in blacklist):
                    continue
                if re.search(r"\d", candidate):
                    continue
                # Extract only alphabetic words to avoid OCR noise/punctuation
                words = re.findall(r"[A-Za-z]+", candidate)
                total_len = sum(len(w) for w in words)
                if 1 < len(words) <= 4 and total_len >= 8:
                    name = " ".join(words)
                    break
            if name is not None:
                break

    # 2) Fallback: scan from bottom for a plausible person name line
    if name is None:
        for line in reversed(lines):
            candidate = line.strip()
            if not candidate:
                continue
            low = candidate.lower()
            if any(word in low for word in blacklist):
                continue
            if any(key in low for key in ("dob", "date of birth", "year of birth", "male", "female")):
                continue
            if re.search(r"\d", candidate):
                continue
            words = re.findall(r"[A-Za-z]+", candidate)
            total_len = sum(len(w) for w in words)
            if 1 < len(words) <= 4 and total_len >= 8:
                name = " ".join(words)
                break

    return name, id_number


def extract_id_text(image: np.ndarray) -> ExtractedText:
    if image is None:
        return ExtractedText(raw_text="", name=None, id_number=None)

    if pytesseract is None:
        msg = (
            "pytesseract or Tesseract OCR is not available. "
            "Set TESSERACT_CMD or install the Tesseract binary to enable OCR."
        )
        return ExtractedText(raw_text=msg, name=None, id_number=None)

    try:
        processed = _preprocess_for_ocr(image)
        text = pytesseract.image_to_string(processed)
    except (TesseractNotFoundError, RuntimeError, OSError) as exc:
        msg = f"OCR not available: {exc}"
        return ExtractedText(raw_text=msg, name=None, id_number=None)

    text = text.strip()
    name, id_number = _extract_name_and_id(text)
    return ExtractedText(raw_text=text, name=name, id_number=id_number)
