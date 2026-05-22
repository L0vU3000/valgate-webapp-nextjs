"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Upload, MoreVertical, FileText } from "lucide-react";
import type { FormData } from "./types";

const easeOut: [number, number, number, number] = [0.25, 1, 0.5, 1];

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

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setForm({ ...form, photos: [...form.photos, ...files.map((f) => f.name)] });
    e.target.value = "";
  }

  function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setForm({ ...form, documents: [...form.documents, ...files.map((f) => f.name)] });
    e.target.value = "";
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full max-w-[760px] mx-auto pb-8">
      {/* Header */}
      <motion.div
        className="flex flex-col gap-[11px] items-center w-full mb-10 shrink-0"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: easeOut }}
      >
        <h2 className="text-[28px] font-bold text-[#1a1c1c] text-center leading-10">
          Add photos and documents
        </h2>
        <motion.p
          className="text-[16px] text-[#5b5f62] text-center leading-[1.43]"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: easeOut, delay: 0.08 }}
        >
          Add photos to your property record and attach key ownership documents.
        </motion.p>
      </motion.div>

      <div className="flex flex-col gap-12">
        {/* Photos Section */}
        <motion.div
          className="border border-border rounded-2xl p-6 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold text-[#1a1c1c]">Photos</h2>
            <motion.button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center gap-1 text-base font-semibold text-[#2563eb] underline decoration-transparent hover:decoration-[#2563eb] transition-[text-decoration-color] duration-200"
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add more
            </motion.button>
            <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
          </div>

          {form.photos.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              <AnimatePresence>
                {form.photos.map((photo, i) => (
                  <motion.div
                    key={photo + i}
                    className="relative overflow-hidden rounded-xl shadow-[0px_0px_0px_1px_rgba(0,0,0,0.02),0px_2px_6px_0px_rgba(0,0,0,0.04),0px_4px_8px_0px_rgba(0,0,0,0.1)] group"
                    initial={{ opacity: 0, scale: 0.88 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.3, ease: easeOut, delay: i * 0.05 }}
                  >
                    <div className="h-[156px] bg-muted flex items-center justify-center px-2">
                      <span className="text-xs text-muted-foreground truncate">{photo}</span>
                    </div>
                    {i === 0 && (
                      <motion.div
                        className="absolute top-2 left-2 bg-white rounded-[14px] px-3 py-1 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25, ease: easeOut, delay: 0.15 }}
                      >
                        <span className="text-xs font-semibold text-[#1a1c1c]">Cover</span>
                      </motion.div>
                    )}
                    <motion.button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5 opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-opacity"
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.88 }}
                      transition={{ duration: 0.12 }}
                    >
                      <Plus className="w-2.5 h-2.5 text-[#1a1c1c] rotate-45" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-2 hover:border-primary transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <motion.div
                className="w-12 h-12 bg-muted rounded-full flex items-center justify-center group/icon"
                whileHover={{ scale: 1.12, backgroundColor: "#2563eb" }}
                transition={{ duration: 0.2, ease: easeOut }}
              >
                <Plus className="w-6 h-6 text-muted-foreground group-hover/icon:text-white transition-colors duration-200" />
              </motion.div>
              <p className="text-sm font-medium text-[#1a1c1c]">Add photos</p>
              <p className="text-xs text-[#5b5f62]">Drag & drop or click to browse</p>
            </motion.button>
          )}
        </motion.div>

        {/* Documents Section */}
        <motion.div
          className="border border-border rounded-2xl p-6 w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-semibold text-[#1a1c1c]">Documents</h2>
            <motion.button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="flex items-center gap-1 text-base font-semibold text-[#2563eb] underline decoration-transparent hover:decoration-[#2563eb] transition-[text-decoration-color] duration-200"
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.15 }}
            >
              <Upload className="w-4 h-4" />
              Upload
            </motion.button>
            <input ref={docInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple className="hidden" onChange={handleDocChange} />
          </div>

          {form.documents.length > 0 ? (
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {form.documents.map((doc, i) => {
                  const meta = getDocMeta(doc);
                  return (
                    <motion.div
                      key={doc + i}
                      className="border border-[#c3c6d7] rounded-xl flex items-center justify-between px-[17px] py-[17px]"
                      initial={{ opacity: 0, x: -14 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 14, transition: { duration: 0.18 } }}
                      transition={{ duration: 0.32, ease: easeOut, delay: i * 0.06 }}
                      whileHover={{ backgroundColor: "rgba(0,0,0,0.015)" }}
                    >
                      <div className="flex items-center gap-4">
                        <motion.div
                          className={`${meta.bg} w-10 h-10 rounded-full flex items-center justify-center shrink-0`}
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.28, ease: easeOut, delay: i * 0.06 + 0.08 }}
                        >
                          <FileText className={`w-5 h-5 ${meta.text}`} />
                        </motion.div>
                        <div>
                          <p className="text-base font-medium text-[#1a1c1c] leading-5">{doc}</p>
                          <p className="text-sm text-[#5b5f62] leading-[21px]">{meta.label}</p>
                        </div>
                      </div>
                      <motion.button
                        type="button"
                        onClick={() => removeDoc(i)}
                        className="rounded-full p-2 hover:bg-muted transition-colors"
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.88 }}
                        transition={{ duration: 0.12 }}
                      >
                        <MoreVertical className="w-4 h-4 text-[#5b5f62]" />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : (
            <motion.button
              type="button"
              onClick={() => docInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-2 hover:border-primary transition-colors"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <motion.div
                className="w-12 h-12 bg-muted rounded-full flex items-center justify-center group/icon"
                whileHover={{ scale: 1.12, backgroundColor: "#2563eb" }}
                transition={{ duration: 0.2, ease: easeOut }}
              >
                <Upload className="w-6 h-6 text-muted-foreground group-hover/icon:text-white transition-colors duration-200" />
              </motion.div>
              <p className="text-sm font-medium text-[#1a1c1c]">Upload documents</p>
              <p className="text-xs text-[#5b5f62]">PDF, Word, Excel accepted</p>
            </motion.button>
          )}
        </motion.div>
      </div>
    </div>
  );
}
