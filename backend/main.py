import base64
import requests
import uvicorn
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fpdf import FPDF
from datetime import datetime

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(title="Xray Medical Diagnostic AI")

# CORS — allow React dev server on both common Vite ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # React (Create React App)
        "http://localhost:5173",   # React (Vite — default)
        "http://localhost:5174",   # React (Vite — fallback)
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Ollama config ──────────────────────────────────────────────────────────────
MODEL_NAME = "medgemma1.5"
OLLAMA_API = "http://localhost:11434/api/chat"

EXPERT_PROMPT = """
You are a Senior Radiologist AI assistant trained to analyze X-ray images.

Your role is to perform structured medical-style analysis, similar to how a radiologist would think, but you MUST communicate cautiously and avoid overconfidence.

CORE BEHAVIOR:

* Analyze step-by-step like a medical expert.
* Be precise, technical, and structured.
* NEVER act fully certain unless evidence is very strong.
* If unsure, prioritize safety over completeness.

STRICT RULES:

* Only describe what is visible in the image.
* Do NOT hallucinate findings.
* Do NOT invent medical history.
* If the image is unclear or insufficient, respond exactly:
  "UNCERTAIN - cannot confirm diagnosis from this image".

MEDICAL ANALYSIS STYLE:

1. OBSERVATIONS (Radiology style)

* Describe findings using medical terminology:
  (e.g., "possible opacity", "alignment preserved", "no visible fracture line")

2. ANALYSIS

* Explain what the observations could indicate
* Link each interpretation to a visible feature
* Do NOT jump to conclusions

3. DIFFERENTIAL DIAGNOSIS (1–3 max)

* List possible conditions (ranked)
* Only include if supported by observations

4. CONFIDENCE LEVEL

* High / Medium / Low (based on visual clarity)

5. IMPRESSION (Final Radiology Summary)

* High → most likely diagnosis
* Medium/Low → "No definitive diagnosis possible"

6. RECOMMENDATION

* Suggest next steps (e.g., CT, MRI, clinical correlation)

7. DISCLAIMER
   This is an AI-generated educational analysis and not a medical diagnosis.


"""

# ── In-memory store ────────────────────────────────────────────────────────────
latest_report = {
    "content": "",
    "timestamp": ""
}

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """
    Frontend pings this on load to check if backend is alive.
    Returns: { "status": "ok", "model": "medgemma1.5" }
    """
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/analyze-xray")
async def analyze_xray(file: UploadFile = File(...)):
    """
    Receives X-ray image from frontend (multipart/form-data, field name = 'file').
    Sends to Ollama, returns diagnosis text.
    Returns: { "status": "success", "diagnosis": "..." }
    """
    global latest_report
    try:
        # Read and base64-encode the image
        content = await file.read()
        image_b64 = base64.b64encode(content).decode("utf-8")

        payload = {
            "model": MODEL_NAME,
            "messages": [
                {
                    "role": "user",
                    "content": EXPERT_PROMPT,
                    "images": [image_b64]
                }
            ],
            "stream": False
        }

        response = requests.post(OLLAMA_API, json=payload, timeout=180)
        response.raise_for_status()
        data = response.json()

        if "message" not in data:
            raise HTTPException(status_code=500, detail="Unexpected response from Ollama — check model name")

        report_text = data["message"]["content"]

        # Save for PDF download
        latest_report["content"] = report_text
        latest_report["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        return {"status": "success", "diagnosis": report_text}

    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=503,
            detail="Cannot reach Ollama at localhost:11434. Run: ollama serve"
        )
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=504,
            detail="Ollama timed out. The model may be loading — try again in a moment."
        )
    except Exception as e:
        print(f"[ERROR] /analyze-xray: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/download-report")
async def download_report():
    """
    Generates a PDF from the last diagnosis and returns it as a file download.
    Frontend calls this after a successful /analyze-xray.
    Returns: PDF file (application/pdf)
    """
    global latest_report

    if not latest_report["content"]:
        raise HTTPException(
            status_code=400,
            detail="No diagnosis available. Please analyze an X-ray image first."
        )

    try:
        pdf = FPDF()
        pdf.add_page()

        # ── Header ──────────────────────────────────────────────────────────
        pdf.set_fill_color(0, 51, 102)
        pdf.rect(0, 0, 210, 28, "F")

        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(255, 255, 255)
        pdf.set_y(8)
        pdf.cell(0, 10, txt="MEDICAL AI DIAGNOSTIC REPORT", ln=True, align="C")

        pdf.set_font("Helvetica", size=9)
        pdf.set_text_color(200, 220, 255)
        pdf.cell(0, 6, txt="Xray Medical Diagnostic AI  ·  Powered by MedGemma 1.5  ·  Educational Use Only", ln=True, align="C")

        pdf.ln(10)

        # ── Timestamp & file info ────────────────────────────────────────────
        pdf.set_font("Helvetica", size=10)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 7, txt=f"Generated on: {latest_report['timestamp']}", ln=True, align="C")
        pdf.ln(4)

        # ── Divider ──────────────────────────────────────────────────────────
        pdf.set_draw_color(0, 51, 102)
        pdf.set_line_width(0.7)
        pdf.line(12, pdf.get_y(), 198, pdf.get_y())
        pdf.ln(6)

        # ── Report body ──────────────────────────────────────────────────────
        pdf.set_font("Helvetica", size=11)
        pdf.set_text_color(20, 30, 40)

        # latin-1 safe (FPDF doesn't support full UTF-8 without a custom font)
        clean_text = latest_report["content"].encode("latin-1", "replace").decode("latin-1")

        for line in clean_text.split("\n"):
            stripped = line.strip()
            # Section headers: bold blue
            import re
            if re.match(r"^\d+\.\s+[A-Z]", stripped) or stripped.upper() == stripped and len(stripped) > 3:
                pdf.set_font("Helvetica", "B", 11)
                pdf.set_text_color(0, 51, 102)
                pdf.multi_cell(0, 8, txt=stripped)
                pdf.set_font("Helvetica", size=11)
                pdf.set_text_color(20, 30, 40)
            else:
                pdf.multi_cell(0, 7, txt=line)
            pdf.ln(0.5)

        # ── Footer ───────────────────────────────────────────────────────────
        pdf.ln(6)
        pdf.set_draw_color(180, 180, 180)
        pdf.set_line_width(0.3)
        pdf.line(12, pdf.get_y(), 198, pdf.get_y())
        pdf.ln(4)

        pdf.set_font("Helvetica", "I", 8)
        pdf.set_text_color(130, 130, 130)
        pdf.multi_cell(
            0, 5,
            txt=(
                "DISCLAIMER: This report is AI-generated for educational purposes only and does not constitute a medical diagnosis. "
                "Always consult a licensed physician for any medical concerns."
            ),
            align="C"
        )

        # ── Save & return ─────────────────────────────────────────────────────
        file_path = "medical_report.pdf"
        pdf.output(file_path)

        return FileResponse(
            file_path,
            media_type="application/pdf",
            filename="Medical_Report.pdf"
        )

    except Exception as e:
        print(f"[ERROR] /download-report: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {e}")


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)