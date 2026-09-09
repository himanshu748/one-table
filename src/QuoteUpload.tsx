import { useState, type FormEvent } from "react";
import { useAction, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
export function QuoteUpload({ vendorId }: { vendorId: Id<"vendors"> }) {
  const upload = useAction(api.attachments.upload);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const file = new FormData(form).get("quote") as File;
    if (!file?.size || file.size > 4 * 1024 * 1024) {
      setError("Choose a PDF, PNG or JPEG up to 4 MB.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await upload({
        vendorId,
        name: file.name,
        mime: file.type,
        bytes: await file.arrayBuffer(),
      });
      form.reset();
      setNotice(
        "Document saved. Extraction is queued; check Original messages below for the result.",
      );
    } catch (e) {
      setError(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Upload failed. Your file has not been added; try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="upload-panel" onSubmit={submit}>
      <h3>Have a PDF or a photo of the quote?</h3>
      <p>
        Upload one document per reply. We save the original privately and send
        it to OpenAI to read prices and terms. Review the extracted result
        before relying on it.
      </p>
      <label>
        Quote document
        <input
          type="file"
          name="quote"
          required
          accept="application/pdf,image/png,image/jpeg"
          disabled={busy}
        />
      </label>
      <span className="note">
        PDF, PNG or JPEG · up to 4 MB · 10 uploads per day. Uploading never
        sends email.
      </span>
      <button disabled={busy}>
        {busy ? "Uploading document…" : "Upload & extract quote"}
      </button>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </form>
  );
}
export function OriginalAttachments({
  messageId,
}: {
  messageId: Id<"messages">;
}) {
  const files = useQuery(api.attachmentData.forMessage, { messageId });
  return (
    <div className="original-files">
      {files?.map((f) => (
        <a key={f.url} href={f.url} target="_blank" rel="noreferrer">
          Open original: {f.name} ↗
        </a>
      ))}
    </div>
  );
}
