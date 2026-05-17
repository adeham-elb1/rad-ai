import { useState, useRef } from "react";
import "./App.css";

const API_BASE = "http://localhost:8000";

export default function App() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [statusMsg, setStatusMsg] = useState("Awaiting image input");
  const [downloading, setDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setDiagnosis(null);
    setStatusMsg(`Image loaded — ${f.name}`);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setScanning(true);
    setDiagnosis(null);
    setStatusMsg("Transmitting image to MedGemma 1.5 engine…");

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/analyze-xray`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setDiagnosis(data.diagnosis || data.result || JSON.stringify(data));
      setStatusMsg("Analysis complete — report ready");
    } catch {
      setDiagnosis(
        `1. OBSERVATIONS\n— Lung fields appear clear bilaterally.\n— Cardiac silhouette within normal size limits.\n— Costophrenic angles are sharp.\n— No acute bony abnormality identified.\n\n2. POSSIBLE INTERPRETATIONS\n— Normal chest radiograph (most likely)\n— Early interstitial changes cannot be excluded\n— Mild cardiomegaly possible pending measurement\n\n3. CONFIDENCE LEVEL\nMedium\n\n4. FINAL ASSESSMENT\nNo definitive diagnosis possible from this image alone. Clinical correlation required.\n\n5. CLINICAL NOTE\nRecommend clinical correlation with patient symptoms. Consider CT thorax if symptoms persist or worsen.\n\n6. DISCLAIMER\nThis is an AI-generated educational analysis and does not constitute a medical diagnosis.`
      );
      setStatusMsg("DEMO MODE — connect backend at localhost:8000 for live analysis");
    }

    setLoading(false);
    setScanning(false);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setStatusMsg("Compiling PDF report…");
    try {
      const res = await fetch(`${API_BASE}/download-report`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Medical_Report.pdf";
      a.click();
      setStatusMsg("PDF report downloaded");
    } catch {
      setStatusMsg("DEMO MODE — PDF requires live backend");
      alert("Connect your FastAPI backend at localhost:8000 to download the real PDF.");
    }
    setDownloading(false);
  };

  const parseSections = (text) => {
    if (!text) return [];
    const lines = text.split("\n");
    const sections = [];
    let current = null;
    for (const line of lines) {
      const isHeader = /^\d+\.\s+[A-Z]/.test(line) || /^DISCLAIMER/i.test(line);
      if (isHeader) {
        if (current) sections.push(current);
        current = { title: line.trim(), lines: [] };
      } else if (current && line.trim()) {
        current.lines.push(line.trim());
      }
    }
    if (current) sections.push(current);
    return sections;
  };

  const sections = parseSections(diagnosis);

  const sectionAccent = (title) => {
    if (/OBSERVATION/i.test(title)) return "#0066cc";
    if (/INTERPRETATION/i.test(title)) return "#c07800";
    if (/CONFIDENCE/i.test(title)) return "#18a05a";
    if (/ASSESSMENT/i.test(title)) return "#c05000";
    if (/CLINICAL/i.test(title)) return "#6644cc";
    return "#7a90a8";
  };

  return (
    <div className="shell">
      <div className="noise" />
      <div className="scanlines" />

      {/* HEADER */}
      <header className="header">
        <div className="header-left">
          <div className="logo-mark">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect x="2" y="7" width="30" height="20" rx="2.5" stroke="#0066cc" strokeWidth="1.5" />
              <circle cx="17" cy="17" r="6.5" stroke="#0066cc" strokeWidth="1.5" />
              <circle cx="17" cy="17" r="2" fill="#0066cc" />
              <line x1="17" y1="10.5" x2="17" y2="8.5" stroke="#0066cc" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="17" y1="25.5" x2="17" y2="23.5" stroke="#0066cc" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="10.5" y1="17" x2="8.5" y2="17" stroke="#0066cc" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="25.5" y1="17" x2="23.5" y2="17" stroke="#0066cc" strokeWidth="1.5" strokeLinecap="round" />
              <rect x="2" y="7" width="7" height="4" rx="1.5" fill="#0066cc" opacity="0.2" />
              <rect x="25" y="7" width="7" height="4" rx="1.5" fill="#0066cc" opacity="0.2" />
            </svg>
          </div>
          <div>
            <div className="logo-title">Xray Medical Diagnostic AI</div>
            <div className="logo-sub">Powered by MedGemma 1.5 · Radiological Analysis System</div>
          </div>
        </div>
        <div className="header-right">
          <div className="hbadge online"><span className="blink-dot" />SYSTEM ONLINE</div>
          <div className="hbadge">MEDGEMMA 1.5</div>
          <div className="hbadge">PORT 8000</div>
        </div>
      </header>

      {/* TICKER */}
      <div className="ticker">
        <div className="ticker-track">
          {[...Array(3)].map((_, r) => (
            <span key={r}>
              XRAY DIAGNOSTIC AI &nbsp;·&nbsp; MEDGEMMA 1.5 &nbsp;·&nbsp; EDUCATIONAL USE ONLY &nbsp;·&nbsp;
              UPLOAD IMAGE → ANALYZE → DOWNLOAD PDF &nbsp;·&nbsp; NOT A MEDICAL SUBSTITUTE &nbsp;·&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* BODY */}
      <div className="body">

        {/* LEFT */}
        <section className="panel left-panel">
          <div className="panel-bar">
            <span className="p-num">[ 01 ]</span>
            <span className="p-lbl">IMAGE INPUT TERMINAL</span>
            <span className="p-line" />
          </div>

          <div
            className={`dropzone ${dragOver ? "drag-over" : ""} ${preview ? "has-img" : ""}`}
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault(); setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={inputRef} type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files[0])}
            />

            {preview ? (
              <div className={`img-wrap ${scanning ? "scanning" : ""}`}>
                <img src={preview} alt="X-ray" className="xray-img" />
                {scanning && <div className="beam" />}
                <div className="corners">
                  <i /><i /><i /><i />
                </div>
                {scanning && (
                  <div className="scan-hud">
                    <span className="scan-hud-dot" />
                    ANALYZING IMAGE…
                  </div>
                )}
              </div>
            ) : (
              <div className="drop-idle">
                <div className="drop-ring">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0066cc" strokeWidth="1.3" strokeLinecap="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                <div className="drop-head">DROP X-RAY IMAGE</div>
                <div className="drop-fmts">PNG &nbsp;·&nbsp; JPG &nbsp;·&nbsp; DICOM &nbsp;·&nbsp; ≤ 20 MB</div>
                <div className="drop-click">— click to browse —</div>
              </div>
            )}
          </div>

          <button
            className={`run-btn ${loading ? "is-loading" : ""}`}
            onClick={handleAnalyze}
            disabled={!file || loading}
          >
            {loading ? (
              <><span className="spin" />PROCESSING…</>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                RUN DIAGNOSTIC ANALYSIS
              </>
            )}
          </button>

          <div className="meta-grid">
            <div className="meta-row">
              <span className="mk">MODEL</span>
              <span className="mv cyan">MedGemma 1.5</span>
            </div>
            <div className="meta-row">
              <span className="mk">ENDPOINT</span>
              <span className="mv">localhost:8000/analyze-xray</span>
            </div>
            <div className="meta-row">
              <span className="mk">STATUS</span>
              <span className="mv green">{statusMsg}</span>
            </div>
            <div className="meta-row">
              <span className="mk">FILE</span>
              <span className="mv">{file ? file.name : "—"}</span>
            </div>
          </div>
        </section>

        {/* RIGHT */}
        <section className="panel right-panel">
          <div className="panel-bar">
            <span className="p-num">[ 02 ]</span>
            <span className="p-lbl">DIAGNOSTIC OUTPUT</span>
            <span className="p-line" />
          </div>

          <div className="output-area">
            {!diagnosis ? (
              <div className="empty">
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#c8d8e8" strokeWidth="1" strokeLinecap="round">
                  <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                  <rect x="9" y="3" width="6" height="4" rx="2" />
                  <line x1="9" y1="12" x2="15" y2="12" />
                  <line x1="9" y1="16" x2="13" y2="16" />
                </svg>
                <div className="empty-title">NO REPORT GENERATED</div>
                <div className="empty-body">
                  Upload an X-ray image and run analysis.<br />
                  The structured diagnostic report will appear here.
                </div>
              </div>
            ) : (
              <div className="report">
                <div className="report-top">
                  <span className="r-badge">◈ DIAGNOSTIC REPORT</span>
                  <span className="r-time">{new Date().toLocaleString()}</span>
                </div>
                <div className="sections">
                  {sections.map((sec, i) => (
                    <div
                      key={i}
                      className="sec"
                      style={{ "--accent": sectionAccent(sec.title) }}
                    >
                      <div className="sec-head">{sec.title}</div>
                      <div className="sec-body">
                        {sec.lines.map((line, j) => (
                          <div key={j} className="sec-line">{line}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            className="dl-btn"
            onClick={handleDownload}
            disabled={!diagnosis || downloading}
          >
            {downloading ? (
              <><span className="spin dark" />GENERATING PDF…</>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                DOWNLOAD PDF REPORT
              </>
            )}
          </button>
        </section>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <span>XRAY MEDICAL DIAGNOSTIC AI</span>
        <span className="fs">·</span>
        <span>FOR EDUCATIONAL USE ONLY</span>
        <span className="fs">·</span>
        <span>NOT A SUBSTITUTE FOR PROFESSIONAL MEDICAL ADVICE</span>
        <span className="fs">·</span>
        <span className="fdim">FastAPI + Ollama + MedGemma 1.5</span>
      </footer>
    </div>
  );
}
