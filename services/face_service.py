from typing import Optional

import cv2
import numpy as np

from models import FaceCompareResult

try:
    import face_recognition
except Exception:  # optional dependency
    face_recognition = None  # type: ignore


FACE_MATCH_THRESHOLD = 50.0


def _detect_faces(image: np.ndarray):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    face_cascade = cv2.CascadeClassifier(cascade_path)
    if face_cascade.empty():
        return []
    faces = face_cascade.detectMultiScale(
        gray,
        scaleFactor=1.05,
        minNeighbors=4,
        minSize=(40, 40),
    )
    return faces


def _crop_first_face(image: np.ndarray, faces):
    if len(faces) == 0:
        return None
    x, y, w, h = faces[0]
    return image[y : y + h, x : x + w]


def compare_faces(id_image: np.ndarray, selfie_image: np.ndarray) -> FaceCompareResult:
    """Compare the face on the ID image with the live selfie.

    Uses the pre-trained face_recognition model (trained on large public datasets)
    for both face detection and embedding extraction. Falls back to Haar cascades
    only to estimate face counts if the deep model is unavailable.
    """

    # If the deep model is not available, return counts only.
    if face_recognition is None:
        id_faces = _detect_faces(id_image)
        selfie_faces = _detect_faces(selfie_image)
        return FaceCompareResult(
            id_faces_count=int(len(id_faces)),
            selfie_faces_count=int(len(selfie_faces)),
            is_match=None,
            match_score=None,
            error="face_recognition library is not installed or failed to import.",
        )

    try:
        # Work in RGB as expected by face_recognition
        id_rgb_full = cv2.cvtColor(id_image, cv2.COLOR_BGR2RGB)
        selfie_rgb_full = cv2.cvtColor(selfie_image, cv2.COLOR_BGR2RGB)

        # Detect faces using the deep model (HOG-based by default)
        id_locations = face_recognition.face_locations(id_rgb_full, model="hog")
        selfie_locations = face_recognition.face_locations(selfie_rgb_full, model="hog")

        id_count = int(len(id_locations))
        selfie_count = int(len(selfie_locations))

        if id_count == 0 or selfie_count == 0:
            return FaceCompareResult(
                id_faces_count=id_count,
                selfie_faces_count=selfie_count,
                is_match=None,
                match_score=None,
                error="No face detected in one of the images.",
            )

        # Compute embeddings for the detected faces
        id_encodings = face_recognition.face_encodings(
            id_rgb_full, known_face_locations=id_locations
        )
        selfie_encodings = face_recognition.face_encodings(
            selfie_rgb_full, known_face_locations=selfie_locations
        )

        if not id_encodings or not selfie_encodings:
            return FaceCompareResult(
                id_faces_count=id_count,
                selfie_faces_count=selfie_count,
                is_match=None,
                match_score=None,
                error="Could not compute face encodings.",
            )

        # Use the first face in each image (most prominent)
        id_encoding = id_encodings[0]
        selfie_encoding = selfie_encodings[0]

        distance = float(
            face_recognition.face_distance([id_encoding], selfie_encoding)[0]
        )
        similarity = float(max(0.0, min(1.0, 1.0 - distance)) * 100.0)
        is_match = bool(similarity >= FACE_MATCH_THRESHOLD)

        return FaceCompareResult(
            id_faces_count=id_count,
            selfie_faces_count=selfie_count,
            is_match=is_match,
            match_score=similarity,
            error=None,
        )
    except Exception as exc:
        # Fall back to simple Haar-based counts if something goes wrong
        backup_id_faces = _detect_faces(id_image)
        backup_selfie_faces = _detect_faces(selfie_image)
        return FaceCompareResult(
            id_faces_count=int(len(backup_id_faces)),
            selfie_faces_count=int(len(backup_selfie_faces)),
            is_match=None,
            match_score=None,
            error=str(exc),
        )
