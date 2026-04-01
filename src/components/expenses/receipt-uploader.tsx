"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2 } from "lucide-react";
import type { ReceiptAnalysis } from "@/types";

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        resolve({ base64: match[2], mediaType: match[1].trim() });
      } else {
        reject(new Error("Geçersiz data URL"));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ReceiptUploader({
  userId,
  onUploaded,
  onAnalysisStart,
  onAnalysisResult,
  disabled,
}: {
  userId: string;
  onUploaded: (url: string) => void;
  onAnalysisStart?: () => void;
  onAnalysisResult?: (result: ReceiptAnalysis | null) => void;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || disabled) return;
    setUploading(true);
    onAnalysisStart?.();

    try {
      const { base64, mediaType } = await fileToBase64(file);
      const res = await fetch("/api/analyze-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType }),
      });
      const data = (await res.json()) as ReceiptAnalysis & { error?: string };
      onAnalysisResult?.(data.error ? { error: data.error } : data);
    } catch {
      onAnalysisResult?.({ error: "OKUNAMADI" });
    }

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("receipts")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("receipts").getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch {
      onUploaded("");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      <div className="grid gap-2 md:gap-0 md:block md:space-y-2">
        <div className="grid grid-cols-1 gap-2 md:hidden">
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 border-2 border-dashed justify-start"
            disabled={disabled || uploading}
            onClick={() => cameraInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <>
                <Camera className="h-5 w-5 mr-2 text-slate-500" />
                <span>Fotoğraf Çek</span>
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-14 border-2 border-dashed justify-start"
            disabled={disabled || uploading}
            onClick={() => galleryInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            ) : (
              <>
                <Upload className="h-5 w-5 mr-2 text-slate-500" />
                <span>Galeriden Seç</span>
              </>
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="hidden md:flex w-full h-24 border-2 border-dashed"
          disabled={disabled || uploading}
          onClick={() => galleryInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
          ) : (
            <>
              <Upload className="h-8 w-8 mr-2 text-slate-500" />
              <span>Galeriden Seç</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
