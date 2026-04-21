import { UploadCloud } from "lucide-react";

export function BatchDropzone() {
  return (
    <div
      className={
        "card p-8 flex flex-col items-center justify-center gap-4 text-center " +
        "border-dashed border-line2 bg-paper/40 opacity-60 cursor-not-allowed select-none"
      }
      aria-disabled="true"
    >
      <div
        aria-hidden="true"
        className="w-14 h-14 rounded-sm bg-muted2 text-white grid place-items-center"
      >
        <UploadCloud size={22} strokeWidth={1.5} />
      </div>
      <div>
        <div className="display-hero text-lg text-muted">Batch upload — coming soon</div>
        <div className="text-xs text-muted mt-1 max-w-sm mx-auto">
          Batch CSV/XLSX inference is not yet available. Check back once the upload endpoint
          ships.
        </div>
      </div>
    </div>
  );
}
