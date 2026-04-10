"use client";

import { useRouter } from "next/navigation";
import { Camera, ChevronLeft, X, Plus, Image as ImageIcon } from "lucide-react";
import type { FormData } from "./types";

export function Step4PhotosDocs({ form, setForm }: { form: FormData; setForm: (f: FormData) => void }) {
  const router = useRouter();

  return (
    <div className="max-w-[800px] mx-auto">
      <button
        onClick={() => router.push("/portfolio")}
        className="flex items-center gap-1 text-[14px] text-muted-foreground hover:text-foreground mb-2"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Portfolio
      </button>
      <h2 className="text-[30px] text-foreground mb-1" style={{ fontWeight: 700 }}>
        Photos & Documents
      </h2>
      <p className="text-[14px] text-muted-foreground mb-6">
        Upload images and important documents for your property
      </p>

      {/* Property Photos */}
      <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
        Property Photos
      </p>
      <div className="border-b-2 border-primary w-full mb-4" />
      <p className="text-[14px] text-muted-foreground mb-3">
        Upload photos to help with identification and documentation
      </p>

      {/* Drop zone */}
      <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center mb-4">
        <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-[14px] text-foreground mb-1">Drag & Drop Photos Here</p>
        <p className="text-[12px] text-muted-foreground mb-3">or</p>
        <button className="bg-primary text-white rounded-lg px-4 py-2 text-[14px] hover:bg-primary/90">
          Browse Files
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-3 mb-8 flex-wrap">
        {form.photos.slice(0, 5).map((p, i) => (
          <div
            key={i}
            className="w-[100px] h-[100px] border border-border rounded-xl flex flex-col items-center justify-center"
          >
            <Camera className="w-6 h-6 text-primary mb-1" />
            <p className="text-[12px] text-muted-foreground">{p}</p>
          </div>
        ))}
        <button className="w-[100px] h-[100px] border border-dashed border-border rounded-xl flex items-center justify-center hover:border-primary transition-colors">
          <Plus className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Property Documents */}
      <p className="text-[16px] text-foreground mb-1" style={{ fontWeight: 600 }}>
        Property Photos
      </p>
      <p className="text-[14px] text-muted-foreground mb-3">
        Upload photos to help with identification and documentation
      </p>

      <div className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center mb-4">
        <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
        <p className="text-[14px] text-foreground mb-1">Drag & Drop Photos Here</p>
        <p className="text-[12px] text-muted-foreground mb-3">or</p>
        <button className="bg-primary text-white rounded-lg px-4 py-2 text-[14px] hover:bg-primary/90">
          Browse Files
        </button>
      </div>

      {/* Uploaded docs list */}
      <div className="space-y-0">
        {form.documents.map((doc, i) => (
          <div
            key={i}
            className="flex items-center justify-between border border-border rounded-xl px-4 py-3 mb-2"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#EFF6FF] rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[14px] text-foreground">{doc}</p>
                <p className="text-[12px] text-muted-foreground">Uploaded 2 minutes ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[12px] text-muted-foreground">123.jpg</span>
              <button className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
