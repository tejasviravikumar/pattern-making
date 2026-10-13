import { useState } from "react";
import UploadForm from "./components/UploadForm";
import PatternViewer from "./components/PatternViewer";
import { generatePattern } from "./api";
import "./App.css";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pattern, setPattern] = useState(null);

  async function handleSubmit(values) {
    setLoading(true);
    setError("");
    setPattern(null);
    try {
      const data = await generatePattern(values);
      setPattern(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1>
          Your photo. <em>Perfectly cut.</em>
        </h1>
        <p>Upload a flat-lay photo of a garment and get a sewing pattern.</p>
      </header>

      <UploadForm onSubmit={handleSubmit} loading={loading} />

      {error && (
        <p className="page__error" role="alert">
          {error}
        </p>
      )}

      <PatternViewer pattern={pattern} />
    </main>
  );
}