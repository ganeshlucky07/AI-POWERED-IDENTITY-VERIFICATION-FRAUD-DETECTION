# AI-Powered KYC Identity Verification & Fraud Detection

Production-ready but lightweight KYC (Know Your Customer) service built with **FastAPI**, **OpenCV**, **Tesseract OCR**, **face-recognition**, and **scikit-learn**.

It verifies that a live selfie matches a government ID image and produces a simple fraud-risk score. The app includes a minimal HTML/JS frontend and is designed to run on **Render Free Tier** with **SQLite** as storage.

---

## Features

- **Image upload UI**
  - Government ID image (Aadhaar / PAN / Passport)
  - Live selfie image
- **Identity verification**
  - OCR (Tesseract) extracts raw text from the ID
  - Heuristics try to extract **name** and **ID number**
  - Face detection in both ID and selfie
  - Face similarity score using `face_recognition`
- **Fraud detection**
  - Detects blurred or low-quality images (Laplacian variance)
  - Flags missing or multiple faces
  - Simple fraud probability model using LogisticRegression (scikit-learn)
  - Final fraud risk: **Low / Medium / High**
- **KYC result**
  - `VERIFIED` or `REJECTED`
  - Human-readable reasons
  - Confidence score
  - Results logged in SQLite (`kyc.db`)

---

## Tech Stack

- **Backend**: Python, FastAPI, Uvicorn, Pydantic
- **AI / ML**:
  - OpenCV (image processing, blur, brightness, face detection)
  - face-recognition (face embeddings + similarity)
  - Tesseract OCR via `pytesseract` (text extraction)
  - scikit-learn LogisticRegression (toy fraud model)
- **Frontend**: HTML, CSS, vanilla JavaScript
- **Database**: SQLite file (`kyc.db` by default)
- **Deployment**: Render (Free Tier) using `uvicorn main:app --host 0.0.0.0 --port 10000`

---

## How the AI Pipeline Works

### 1. OCR (ID text extraction)

Implemented in `services/ocr_service.py`:

1. Convert ID image to grayscale.
2. Denoise with a bilateral filter.
3. Apply Otsu thresholding for better contrast.
4. Run `pytesseract.image_to_string` on the processed image.

Then simple regex + heuristics:

- PAN-like pattern: 5 letters + 4 digits + 1 letter (e.g. `ABCDE1234F`).
- Aadhaar-like pattern: 12 digits, optionally spaced (e.g. `1234 5678 9012`).
- Passport-like pattern: 1 letter + 7 digits.
- Name candidate: a line with at least two words, no digits, and not containing common government words.

If Tesseract is not installed or not found, OCR returns a message indicating that it is unavailable instead of failing.

### 2. Face detection & matching

Implemented in `services/face_service.py`:

1. Detect faces in both images using OpenCV Haar cascades.
2. If `face_recognition` is available:
   - Crop the first face from each image.
   - Convert to RGB and compute face encodings.
   - Use `face_recognition.face_distance` to get a distance.
   - Convert distance to a similarity percentage (0–100%).
   - Consider a match if similarity ≥ 75%.

If `face_recognition` is missing or encoding fails, the service returns face counts and an explanatory error.

### 3. Fraud detection

Implemented in `services/fraud_service.py`:

- Compute **blur score** for each image using the variance of the Laplacian (scaled to 0–100).
- Compute **brightness** from the V channel of HSV (0–255).
- Use face counts to detect multiple/no faces.

Heuristics:

- Very low blur ⇒ blurred image ⇒ at least **Medium** risk.
- Very dark or overexposed ⇒ **Medium** risk.
- Face count ≠ 1 in either image ⇒ **High** risk.

If scikit-learn is available, a tiny LogisticRegression model (trained on synthetic data at startup) takes:

- ID blur score
- Selfie blur score
- Multiple-faces flag

and outputs a probability used to slightly adjust **Low / Medium / High**.

### 4. Final KYC decision

Handled in `main.py` (`/kyc/verify` endpoint):

- Start with `VERIFIED` and the fraud label from the fraud service.
- Reject if:
  - Face analysis fails.
  - Face count is not exactly one in each image.
  - Face match score is below threshold.
  - Fraud risk is `High`.
- Build a **confidence score** (0–1) based on:
  - Face similarity bucket.
  - Fraud risk label.

The app stores a summary row in SQLite: status, scores, fraud label, extracted name/ID, and confidence.

---

## Project Structure

```text
KYC_PRO/
 ├── main.py                # FastAPI app, endpoints, DB init & logging
 ├── models.py              # Pydantic models (responses and internal DTOs)
 ├── services/
 │    ├── ocr_service.py    # Tesseract OCR + extraction of name/ID
 │    ├── face_service.py   # OpenCV + face_recognition face matching
 │    ├── fraud_service.py  # Blur/brightness checks + tiny ML model
 ├── templates/
 │    └── index.html        # Simple KYC frontend
 ├── static/
 │    ├── style.css         # Styling for the UI
 │    └── script.js         # JS for calling /kyc/verify
 ├── requirements.txt       # Python dependencies
 ├── render.yaml            # Render web service definition (optional helper)
 └── README.md
```

---

## Running Locally

### 1. Create and activate a virtual environment

From the `KYC_PRO` folder:

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Install Tesseract OCR (recommended)

Install the **Tesseract** binary for your OS:

- **Windows**: Download and install from a trusted Tesseract installer.
- After installation, note the full path to the `tesseract` executable (for example: `C:/Program Files/Tesseract-OCR/tesseract.exe`).

Set the `TESSERACT_CMD` environment variable so `pytesseract` can find it:

```powershell
$env:TESSERACT_CMD = "C:/Program Files/Tesseract-OCR/tesseract.exe"
```

> If you skip this, the app will still run, but OCR will return a message stating that Tesseract is unavailable.

### 3. Run the app

```bash
uvicorn main:app --host 0.0.0.0 --port 10000 --reload
```

Then open in your browser:

- UI: <http://localhost:10000/>
- API docs: <http://localhost:10000/docs>

---

## API Endpoints

### `GET /health`

Simple health check.

**Example response:**

```json
{
  "status": "ok",
  "app": "AI KYC Identity Verification API",
  "time": "2024-01-01T12:00:00.000000Z"
}
```

### `POST /kyc/verify`

Accepts two image files and returns the KYC decision.

- **Content Type**: `multipart/form-data`
- **Fields**:
  - `id_image`: government ID image file
  - `selfie_image`: selfie image file

Example `curl` usage:

```bash
curl -X POST "http://localhost:10000/kyc/verify" \
  -F "id_image=@/path/to/id-card.jpg" \
  -F "selfie_image=@/path/to/selfie.jpg"
```

**Response shape (example):**

```json
{
  "verification_status": "VERIFIED",
  "face_match_score": 92.5,
  "fraud_risk": "Low",
  "fraud_reasons": [
    "Image sharpness is slightly low."
  ],
  "extracted_text": {
    "raw_text": "... full OCR text ...",
    "name": "JOHN DOE",
    "id_number": "ABCDE1234F"
  },
  "confidence_score": 0.86,
  "reason": null,
  "request_id": 1,
  "processing_time_ms": 250
}
```

---

## Deploying on Render (Free Tier)

### 1. Push to a Git repository

Commit this project and push it to GitHub/GitLab/Bitbucket.

### 2. Create a new Web Service on Render

You can let Render auto-detect `render.yaml` or configure manually:

- **Environment**: `Python`
- **Build Command**:

  ```bash
  pip install --upgrade pip && pip install -r requirements.txt
  ```

- **Start Command**:

  ```bash
  uvicorn main:app --host 0.0.0.0 --port 10000
  ```

### 3. Environment variables

Configure environment variables (in Render dashboard or `render.yaml`):

- `PYTHON_VERSION` – for example `3.11.6`.
- `KYC_DB_PATH` – like `kyc.db` (default) or a path under `/data` if you use a persistent disk.
- Optionally `TESSERACT_CMD` if you manage to install the Tesseract binary on Render.

> Note: Installing `face-recognition` and Tesseract binaries on serverless platforms can be heavy. Build times may be long or require a custom image. The app is written to **fail gracefully** if these components are missing (you will still get structured responses, but with reduced capabilities).

### 4. Database persistence

- This demo uses **SQLite**, which stores everything in a local file (`kyc.db`).
- On many free-tier hosts, the filesystem may be ephemeral (data may be reset on redeploys).
- For serious production use, plan to switch to a managed PostgreSQL/MySQL database.

---

## Notes & Limitations

- This is a **demonstration** KYC / fraud detection system, not a complete compliance-grade solution.
- Real KYC systems typically include:
  - Liveness checks (video, challenge-response)
  - Tamper-detection / forgery detection
  - Cross-checking with government or bank databases
- Always follow local privacy and data-protection laws when handling ID documents and biometrics.

---

## Customisation Ideas

- Replace `face_recognition` with a more advanced face-matching API or custom deep learning model.
- Train a real fraud model using your own labelled KYC data.
- Add a dashboard to list/search historic KYC checks from the SQLite DB.
- Plug this microservice into a larger onboarding workflow (web or mobile app).
