const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Sends the garment photo and settings to the backend.
 * Field names must match what your FastAPI route expects.
 */
export async function generatePattern({
  file,
  garmentType,
  referenceCm,
  referenceAxis,
  seamAllowanceCm,
  signal,
}) {
  const form = new FormData();
  form.append("image", file); // backend parameter is named "image"
  form.append("garment_type", garmentType);
  if (referenceCm) {
    form.append("reference_cm", String(referenceCm));
    form.append("reference_axis", referenceAxis);
  }
  form.append("seam_allowance_cm", String(seamAllowanceCm));

  let res;
  try {
    res = await fetch(`${BASE_URL}/api/patterns/generate`, {
      method: "POST",
      body: form,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  if (!res.ok) {
    let message = `Server error (${res.status}). Check the backend terminal.`;
    try {
      const data = await res.json();
      if (typeof data.detail === "string") {
        message = data.detail;
      } else if (Array.isArray(data.detail)) {
        // FastAPI validation errors: show which field is wrong
        message =
          `Request rejected (${res.status}): ` +
          data.detail
            .map((d) => `${(d.loc || []).join(".")} - ${d.msg}`)
            .join("; ");
      }
    } catch {
      /* response was not JSON, keep the default message */
    }
    throw new Error(message);
  }

  return res.json();
}