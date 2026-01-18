# IDENTITY AGENT Pro 🛡️

**Enterprise-grade Identity Verification System** powered by Google Gemini 3 Pro.

## Overview

Identity Agent is a sophisticated Know Your Customer (KYC) application that leverages Generative AI to perform forensic document analysis and biometric verification.

### Core Features

*   **Forensic Document Analysis**: Uses `gemini-3-pro-preview` with **Thinking Models** to detect pixel-level tampering, font inconsistencies, and layout anomalies in ID documents (Aadhaar, PAN, Passport, etc.).
*   **Biometric Matching**: Compares facial landmarks between ID photos and live selfies with high tolerance for aging/lighting.
*   **Liveness Detection**: Interactive camera interface with scanning animations to ensure user presence.
*   **Device Intelligence**: Fingerprints OS, Browser, and IP to detect potential botnets.
*   **WebAuthn Integration**: Supports passwordless biometric login (Fingerprint/FaceID).

## Tech Stack

*   **Frontend**: React 19, Tailwind CSS, Lucide Icons.
*   **AI Engine**: Google Gemini API (`@google/genai`).
*   **Security**: Web Crypto API, LocalStorage Encryption (Simulated).

## Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file and add your Google API Key:
    ```env
    API_KEY=your_gemini_api_key_here
    ```
4.  Start the development server:
    ```bash
    npm run dev
    ```

## Security Note

This is a client-side demonstration architecture. For production use, the API Key handling and verification logic should be moved to a secure backend server.
