document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("kyc-form");
  const idInput = document.getElementById("id_image");
  const selfieInput = document.getElementById("selfie_image");
  const submitBtn = document.getElementById("submit-btn");
  const loader = document.getElementById("loader");
  const errorMessage = document.getElementById("error-message");

  const resultSection = document.getElementById("result");
  const statusEl = document.getElementById("result-status");
  const faceScoreEl = document.getElementById("result-face-score");
  const faceMatchResultEl = document.getElementById("result-face-match");
  const fraudRiskEl = document.getElementById("result-fraud-risk");
  const fraudReasonsEl = document.getElementById("result-fraud-reasons");
  const nameEl = document.getElementById("result-name");
  const idNumberEl = document.getElementById("result-id-number");
  const idValidityEl = document.getElementById("result-id-validity");
  const rawTextEl = document.getElementById("result-raw-text");
  const confidenceEl = document.getElementById("result-confidence");
  const requestIdEl = document.getElementById("result-request-id");
  const processingTimeEl = document.getElementById("result-processing-time");

  const startCameraBtn = document.getElementById("start-camera-btn");
  const stopCameraBtn = document.getElementById("stop-camera-btn");
  const captureIdBtn = document.getElementById("capture-id-btn");
  const captureSelfieBtn = document.getElementById("capture-selfie-btn");
  const cameraVideo = document.getElementById("camera-video");
  const cameraCanvas = document.getElementById("camera-canvas");
  const idCaptureStatus = document.getElementById("id-capture-status");
  const selfieCaptureStatus = document.getElementById("selfie-capture-status");

  let cameraStream = null;
  let capturedIdBlob = null;
  let capturedSelfieBlob = null;

  function setLoading(isLoading) {
    if (isLoading) {
      loader.classList.remove("hidden");
      submitBtn.disabled = true;
      errorMessage.classList.add("hidden");
    } else {
      loader.classList.add("hidden");
      submitBtn.disabled = false;
    }
  }

  function resetResult() {
    resultSection.classList.add("hidden");
    statusEl.textContent = "";
    statusEl.classList.remove("status-verified", "status-rejected");
    faceScoreEl.textContent = "";
    fraudRiskEl.textContent = "";
    fraudRiskEl.classList.remove("risk-low", "risk-medium", "risk-high");
    fraudReasonsEl.innerHTML = "";
    nameEl.textContent = "";
    idNumberEl.textContent = "";
    if (faceMatchResultEl) {
      faceMatchResultEl.textContent = "";
      faceMatchResultEl.classList.remove("match-yes", "match-no");
    }
    if (idValidityEl) {
      idValidityEl.textContent = "";
    }
    if (rawTextEl) {
      rawTextEl.textContent = "";
    }
    confidenceEl.textContent = "";
    requestIdEl.textContent = "";
    processingTimeEl.textContent = "";
  }

  function openSelfieFilePickerFallback(optionalMessage) {
    if (optionalMessage) {
      errorMessage.textContent = optionalMessage;
      errorMessage.classList.remove("hidden");
    } else {
      errorMessage.classList.add("hidden");
    }

    if (selfieInput) {
      selfieInput.click();
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      cameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
      cameraVideo.classList.add("hidden");
    }
    if (captureIdBtn) {
      captureIdBtn.disabled = true;
    }
    if (stopCameraBtn) {
      stopCameraBtn.disabled = true;
    }
  }

  async function startCamera() {
    const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

    if (!hasMediaDevices) {
      openSelfieFilePickerFallback(
        "Camera is not supported in this browser or device. Please upload a selfie image."
      );
      return;
    }

    try {
      if (!cameraStream) {
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
        });
      }
      if (cameraVideo) {
        cameraVideo.srcObject = cameraStream;
        cameraVideo.classList.remove("hidden");
      }
      if (cameraCanvas) {
        cameraCanvas.classList.add("hidden");
      }
      if (captureIdBtn) {
        captureIdBtn.disabled = false;
      }
      if (stopCameraBtn) {
        stopCameraBtn.disabled = false;
      }
      // Automatically capture a selfie frame once the camera stream is ready
      captureFromCamera("selfie");
      errorMessage.classList.add("hidden");
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      openSelfieFilePickerFallback(
        "Unable to access camera: " + message + " — please upload a selfie using the file picker."
      );
    }
  }

  function captureFromCamera(target) {
    if (!cameraVideo || !cameraCanvas) {
      return;
    }
    if (!cameraStream) {
      startCamera();
      return;
    }

    const width = cameraVideo.videoWidth;
    const height = cameraVideo.videoHeight;
    if (!width || !height) {
      // Video metadata might not be ready yet; try again shortly
      setTimeout(() => {
        captureFromCamera(target);
      }, 200);
      return;
    }

    cameraCanvas.width = width;
    cameraCanvas.height = height;
    const ctx = cameraCanvas.getContext("2d");
    ctx.drawImage(cameraVideo, 0, 0, width, height);
    cameraCanvas.classList.remove("hidden");

    cameraCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        if (target === "id") {
          capturedIdBlob = blob;
          if (idCaptureStatus) {
            idCaptureStatus.textContent = "ID image captured from camera.";
          }
        } else if (target === "selfie") {
          capturedSelfieBlob = blob;
          if (selfieCaptureStatus) {
            selfieCaptureStatus.textContent = "Selfie captured from camera.";
          }
        }
      },
      "image/jpeg",
      0.9
    );
  }

  if (startCameraBtn) {
    startCameraBtn.addEventListener("click", () => {
      startCamera();
    });
  }

  if (stopCameraBtn) {
    stopCameraBtn.addEventListener("click", () => {
      stopCamera();
    });
  }

  if (captureIdBtn) {
    captureIdBtn.addEventListener("click", () => {
      captureFromCamera("id");
    });
  }

  if (captureSelfieBtn) {
    captureSelfieBtn.addEventListener("click", () => {
      captureFromCamera("selfie");
    });
  }

  window.addEventListener("beforeunload", () => {
    stopCamera();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.classList.add("hidden");
    errorMessage.textContent = "";
    resetResult();

    let idFile = idInput.files[0];
    let selfieFile = selfieInput ? selfieInput.files[0] : null;

    if (!idFile && capturedIdBlob) {
      idFile = new File(
        [capturedIdBlob],
        "id-camera.jpg",
        { type: capturedIdBlob.type || "image/jpeg" }
      );
    }

    if (!selfieFile && capturedSelfieBlob) {
      selfieFile = new File(
        [capturedSelfieBlob],
        "selfie-camera.jpg",
        { type: capturedSelfieBlob.type || "image/jpeg" }
      );
    }

    if (!idFile || !selfieFile) {
      errorMessage.textContent = "Please provide both an ID image and a selfie (upload or camera).";
      errorMessage.classList.remove("hidden");
      return;
    }

    const formData = new FormData();
    formData.append("id_image", idFile);
    formData.append("selfie_image", selfieFile);

    setLoading(true);

    try {
      const response = await fetch("/kyc/verify", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data.detail || "KYC verification failed. Please try again.";
        throw new Error(detail);
      }

      const status = data.verification_status || "";
      statusEl.textContent = status;
      statusEl.classList.add(status === "VERIFIED" ? "status-verified" : "status-rejected");

      if (typeof data.face_match_score === "number") {
        faceScoreEl.textContent = data.face_match_score.toFixed(1) + " %";
      } else {
        faceScoreEl.textContent = "N/A";
      }

      // Face match result: Matched / Not matched / Unavailable
      let isFaceMatch = null;
      if (typeof data.is_face_match === "boolean") {
        isFaceMatch = data.is_face_match;
      } else if (typeof data.face_match_score === "number") {
        // Keep this threshold in sync with FACE_MATCH_THRESHOLD in face_service.py
        isFaceMatch = data.face_match_score >= 50.0;
      }

      if (faceMatchResultEl) {
        if (isFaceMatch === true) {
          faceMatchResultEl.textContent = "Matched";
          faceMatchResultEl.classList.add("match-yes");
        } else if (isFaceMatch === false) {
          faceMatchResultEl.textContent = "Not matched";
          faceMatchResultEl.classList.add("match-no");
        } else {
          faceMatchResultEl.textContent = "Unavailable";
        }
      }

      const fraudRisk = data.fraud_risk || "Unknown";
      fraudRiskEl.textContent = fraudRisk;
      fraudRiskEl.classList.add(
        fraudRisk === "Low" ? "risk-low" :
        fraudRisk === "High" ? "risk-high" :
        "risk-medium"
      );

      const reasons = Array.isArray(data.fraud_reasons) ? data.fraud_reasons : [];
      fraudReasonsEl.innerHTML = "";
      if (reasons.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No specific risk factors detected.";
        fraudReasonsEl.appendChild(li);
      } else {
        reasons.forEach((reason) => {
          const li = document.createElement("li");
          li.textContent = reason;
          fraudReasonsEl.appendChild(li);
        });
      }

      const extracted = data.extracted_text || {};
      nameEl.textContent = extracted.name || "Not detected";
      idNumberEl.textContent = extracted.id_number || "Not detected";
      if (rawTextEl) {
        rawTextEl.textContent = extracted.raw_text || "";
      }

      // ID validity: show if a government ID number was detected
      const govIdDetected =
        (typeof data.government_id_detected === "boolean" && data.government_id_detected) ||
        !!extracted.id_number;
      if (idValidityEl) {
        idValidityEl.textContent = govIdDetected
          ? "Government ID detected"
          : "No valid government ID detected";
      }

      if (typeof data.confidence_score === "number") {
        confidenceEl.textContent = (data.confidence_score * 100).toFixed(1) + " %";
      }

      if (data.request_id != null) {
        requestIdEl.textContent = String(data.request_id);
      } else {
        requestIdEl.textContent = "Not stored";
      }

      if (typeof data.processing_time_ms === "number") {
        processingTimeEl.textContent = String(data.processing_time_ms);
      }

      resultSection.classList.remove("hidden");
    } catch (err) {
      const message = err && err.message ? err.message : "Unexpected error occurred.";
      errorMessage.textContent = message;
      errorMessage.classList.remove("hidden");
    } finally {
      setLoading(false);
    }
  });
});
