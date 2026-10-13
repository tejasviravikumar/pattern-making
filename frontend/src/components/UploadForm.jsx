import { useEffect, useRef, useState } from "react";
import "./UploadForm.css";

const MAX_MB = 10;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

// Values must match your backend's GarmentType enum (schemas.py).
// Only "top" is confirmed so far; add the others once we see GarmentType.
const GARMENTS = [{ value: "top", label: "Top" }];

export default function UploadForm({ onSubmit, loading }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState("");

  const [garmentType, setGarmentType] = useState("top");
  const [referenceCm, setReferenceCm] = useState("");
  const [referenceAxis, setReferenceAxis] = useState("width");
  const [seamAllowanceCm, setSeamAllowanceCm] = useState(1.5);

  // Create and clean up the preview URL
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(f) {
    setFileError("");
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setFileError("Please upload a JPG, PNG or WebP photo.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`That photo is too large. Keep it under ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    chooseFile(e.dataTransfer.files?.[0]);
  }

  function clearFile() {
    setFile(null);
    setFileError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setFileError("Add a photo of your garment first.");
      return;
    }
    onSubmit({
      file,
      garmentType,
      referenceCm: referenceCm ? Number(referenceCm) : null,
      referenceAxis,
      seamAllowanceCm: Number(seamAllowanceCm),
    });
  }

  return (
    <form className="upload" onSubmit={handleSubmit}>
      {/* Photo tips */}
      <ul className="upload__tips">
        <li>Lay the garment flat</li>
        <li>Use a plain, contrasting background</li>
        <li>Keep the whole garment in frame</li>
        <li>Smooth out wrinkles and folds</li>
      </ul>

      {/* Drop zone / preview */}
      {!previewUrl ? (
        <div
          className={`dropzone ${dragging ? "dropzone--active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          aria-label="Upload a garment photo"
        >
          <div className="dropzone__icon" aria-hidden="true">
            &#8593;
          </div>
          <p className="dropzone__title">Drag a photo here, or click to browse</p>
          <p className="dropzone__hint">JPG, PNG or WebP, up to {MAX_MB} MB</p>
        </div>
      ) : (
        <div className="preview">
          <img src={previewUrl} alt="Your garment preview" />
          <div className="preview__bar">
            <span className="preview__name">{file.name}</span>
            <button type="button" className="link-btn" onClick={clearFile}>
              Replace photo
            </button>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        capture="environment"
        hidden
        onChange={(e) => chooseFile(e.target.files?.[0])}
      />

      {fileError && (
        <p className="upload__error" role="alert">
          {fileError}
        </p>
      )}

      {/* Settings */}
      <div className="fields">
        <label className="field">
          <span>Garment type</span>
          <select
            value={garmentType}
            onChange={(e) => setGarmentType(e.target.value)}
          >
            {GARMENTS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>One real measurement (cm)</span>
          <input
            type="number"
            min="1"
            max="300"
            step="0.1"
            placeholder="e.g. 52"
            value={referenceCm}
            onChange={(e) => setReferenceCm(e.target.value)}
          />
          <small>Optional. It makes the pattern's scale more accurate.</small>
        </label>

        <label className="field">
          <span>That measurement is the garment's</span>
          <select
            value={referenceAxis}
            onChange={(e) => setReferenceAxis(e.target.value)}
            disabled={!referenceCm}
          >
            <option value="width">Width</option>
            <option value="height">Height</option>
          </select>
        </label>

        <label className="field">
          <span>Seam allowance (cm)</span>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={seamAllowanceCm}
            onChange={(e) => setSeamAllowanceCm(e.target.value)}
          />
        </label>
      </div>

      <button className="btn" type="submit" disabled={loading || !file}>
        {loading ? "Generating pattern..." : "Generate pattern"}
      </button>
    </form>
  );
}