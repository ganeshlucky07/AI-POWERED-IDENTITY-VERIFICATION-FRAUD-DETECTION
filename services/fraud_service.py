from typing import List

import cv2
import numpy as np

from models import FraudAssessment

try:
    from sklearn.linear_model import LogisticRegression

    SKLEARN_AVAILABLE = True
except Exception:  # optional dependency
    SKLEARN_AVAILABLE = False
    LogisticRegression = None  # type: ignore

_log_reg_model = None


def _init_model() -> None:
    global _log_reg_model
    if not SKLEARN_AVAILABLE:
        return

    X = np.array(
        [
            [30.0, 30.0, 1.0],
            [40.0, 60.0, 0.0],
            [70.0, 70.0, 0.0],
            [90.0, 90.0, 0.0],
            [20.0, 80.0, 1.0],
            [85.0, 50.0, 0.0],
        ],
        dtype=float,
    )
    y = np.array([1, 1, 0, 0, 1, 0], dtype=int)

    model = LogisticRegression()
    model.fit(X, y)
    _log_reg_model = model


if SKLEARN_AVAILABLE:
    _init_model()


def _blur_score(image: np.ndarray) -> float:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    variance = cv2.Laplacian(gray, cv2.CV_64F).var()
    capped = max(0.0, min(variance, 500.0))
    return float((capped / 500.0) * 100.0)


def _brightness_score(image: np.ndarray) -> float:
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    v = hsv[:, :, 2]
    return float(v.mean())


def assess_fraud_risk(
    id_image: np.ndarray,
    selfie_image: np.ndarray,
    id_faces_count: int,
    selfie_faces_count: int,
) -> FraudAssessment:
    reasons: List[str] = []

    blur_id = _blur_score(id_image)
    blur_selfie = _blur_score(selfie_image)
    brightness_id = _brightness_score(id_image)
    brightness_selfie = _brightness_score(selfie_image)

    risk_label = "Low"

    if blur_id < 35.0 or blur_selfie < 35.0:
        risk_label = "Medium"
        reasons.append("One or both images look quite blurry.")
    elif blur_id < 55.0 or blur_selfie < 55.0:
        reasons.append("Image sharpness is slightly low.")

    if brightness_id < 40.0 or brightness_selfie < 40.0:
        risk_label = "Medium"
        reasons.append("Low lighting detected in one or both images.")

    if brightness_id > 220.0 or brightness_selfie > 220.0:
        risk_label = "Medium"
        reasons.append("Very bright / overexposed image detected.")

    # Face-count based adjustments: only escalate to HIGH when no faces are found;
    # multiple faces become a medium-risk signal instead of an automatic failure.
    if id_faces_count == 0 or selfie_faces_count == 0:
        risk_label = "High"
        reasons.append("No face detected in one of the images.")
    elif id_faces_count > 1 or selfie_faces_count > 1:
        if risk_label == "Low":
            risk_label = "Medium"
        reasons.append(
            "Multiple faces detected in one of the images; using the primary face for verification."
        )

    faces_flag = 1.0 if (id_faces_count > 1 or selfie_faces_count > 1) else 0.0
    if SKLEARN_AVAILABLE and _log_reg_model is not None:
        features = np.array(
            [[blur_id, blur_selfie, faces_flag]],
            dtype=float,
        )
        try:
            proba = float(_log_reg_model.predict_proba(features)[0, 1])
            if proba > 0.7:
                risk_label = "High"
                reasons.append("ML model predicted a high probability of fraud.")
            elif proba > 0.4 and risk_label == "Low":
                risk_label = "Medium"
                reasons.append(
                    "ML model suggests a slightly elevated probability of fraud."
                )
        except Exception:
            pass

    return FraudAssessment(
        risk_label=risk_label,
        reasons=reasons,
        blur_score_id=blur_id,
        blur_score_selfie=blur_selfie,
    )
