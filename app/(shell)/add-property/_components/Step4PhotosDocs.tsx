"use client";

import { useRef } from "react";
import { Plus, Upload, MoreVertical, FileText } from "lucide-react";
import type { FormData } from "./types";

function getDocMeta(filename: string): { bg: string; text: string; label: string } {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return { bg: "bg-[#ffdad6]", text: "text-[#ba1a1a]", label: "PDF" };
  if (ext === "docx" || ext === "doc") return { bg: "bg-[#dbe1ff]", text: "text-[#2563eb]", label: "Word" };
  if (ext === "xlsx" || ext === "xls") return { bg: "bg-[#d7f5e3]", text: "text-[#1b6b3a]", label: "Excel" };
  return { bg: "bg-muted", text: "text-muted-foreground", label: (ext ?? "File").toUpperCase() };
}

export function Step4PhotosDocs({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  function removePhoto(i: number) {
    setForm({ ...form, photos: form.photos.filter((_, j) => j !== i) });
  }

  function removeDoc(i: number) {
    setForm({ ...form, documents: form.documents.filter((_, j) => j !== i) });
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full max-w-[760px] mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col gap-[11px] items-center w-full mb-10 shrink-0">
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          Add photos and documents
        </h2>
        <p className="text-[16px] text-[#5b5f62] text-center leading-[1.43]">
          Help guests envision their stay and provide necessary documentation.
        </p>
      </div>

      <div className="flex flex-col gap-12">
        {/* Photos Section */}
        <div className="border border-border rounded-2xl p-6 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold text-[#1a1c1c]">Photos</h2>
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-1 text-base font-semibold text-[#2563eb]"
            >
              <Plus className="w-3.5 h-3.5" />
              Add more
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" />
          </div>

          {form.photos.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {form.photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative overflow-hidden rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.02),0px_2px_6px_0px_rgba(0,0,0,0.04),0px_4px_8px_0px_rgba(0,0,0,0.1)] group"
                >
                  <div className="h-[156px] bg-muted flex items-center justify-center px-2">
                    <span className="text-xs text-muted-foreground truncate">{photo}</span>
                  </div>
                  {i === 0 && (
                    <div className="absolute top-2 left-2 bg-white rounded-[14px] px-3 py-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
                      <span className="text-xs font-semibold text-[#1a1c1c]">Cover</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#1a1c1c] rotate-45" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-2 hover:border-primary transition-colors"
            >
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-[#1a1c1c]">Add photos</p>
              <p className="text-xs text-[#5b5f62]">Drag & drop or click to browse</p>
            </button>
          )}
        </div>

        {/* Documents Section */}
        <div className="border border-border rounded-2xl p-6 w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold text-[#1a1c1c]">Documents</h2>
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-1 text-base font-semibold text-[#2563eb]"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" />
          </div>

          {form.documents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {form.documents.map((doc, i) => {
                const meta = getDocMeta(doc);
                return (
                  <div
                    key={i}
                    className="border border-[#c3c6d7] rounded-xl flex items-center justify-between px-[17px] py-[17px]"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`${meta.bg} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}>
                        <FileText className={`w-5 h-5 ${meta.text}`} />
                      </div>
                      <div>
                        <p className="text-base font-medium text-[#1a1c1c] leading-5">{doc}</p>
                        <p className="text-sm text-[#5b5f62] leading-[21px]">{meta.label}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDoc(i)}
                      className="rounded-full p-2 hover:bg-muted transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-[#5b5f62]" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-2 hover:border-primary transition-colors"
            >
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-[#1a1c1c]">Upload documents</p>
              <p className="text-xs text-[#5b5f62]">PDF, Word, Excel accepted</p>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
