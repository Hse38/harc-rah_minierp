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
  const inputRef = useRef<HTMLInputElement>(null);
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
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="outline"
        className="w-full h-24 border-2 border-dashed"
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        ) : (
          <>
            <Camera className="h-8 w-8 mr-2 text-slate-500" />
            <span>Fotoğraf çek veya seç</span>
            <Upload className="h-5 w-5 ml-2 text-slate-400" />
          </>
        )}
      </Button>
    </div>
  );
}
