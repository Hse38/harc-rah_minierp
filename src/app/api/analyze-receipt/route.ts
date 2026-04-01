import { NextResponse } from "next/server";
import { analyzeReceiptFromBase64, analyzeReceiptFromUrl } from "@/lib/claude-vision";
import crypto from "node:crypto";

// Bu bir API route (server-side). Client fetch('/api/analyze-receipt') ile çağırıyor;
// kod burada çalışır, claude-vision da server'da import edilir. ANTHROPIC_API_KEY
// NEXT_PUBLIC_ olmadığı için sadece server'da okunur — doğru kullanım.

export async function POST(request: Request) {
  let response: unknown = null;
  try {
    const body = await request.json();
    const { base64, mediaType, imageUrl } = body ?? {};

    // 1) Gelen isteği logla
    console.log("[analyze-receipt] body keys:", Object.keys(body ?? {}));
    if (base64 != null) {
      console.log("[analyze-receipt] base64 geliyor, uzunluk:", typeof base64 === "string" ? base64.length : 0);
      console.log("[analyze-receipt] mediaType:", mediaType);
    } else {
      console.log("[analyze-receipt] imageUrl geliyor mu?", !!imageUrl, typeof imageUrl === "string" ? imageUrl.slice(0, 60) + "…" : imageUrl);
    }

    if (base64 && typeof base64 === "string" && mediaType) {
      const buf = Buffer.from(base64, "base64");
      const fis_hash =
        buf.length > 0 ? crypto.createHash("sha256").update(buf).digest("hex") : null;
      if (!fis_hash) {
        console.log("[analyze-receipt] UYARI: base64 decode buffer boş, fis_hash üretilemedi.");
      }
      // 2) Direkt base64 kullan — Claude'a ne gönderildiğini logla
      console.log("[analyze-receipt] Claude'a gönderiliyor: base64 length =", base64.length, "mediaType =", mediaType);
      const result = await analyzeReceiptFromBase64(base64, String(mediaType));
      response = { ...(result ?? {}), fis_hash };
      console.log("[analyze-receipt] Claude'dan dönen:", JSON.stringify(result));
      return NextResponse.json({ ...(result ?? { error: "OKUNAMADI" }), fis_hash });
    }

    // Geriye dönük uyumluluk: imageUrl ile çağrı
    if (imageUrl && typeof imageUrl === "string") {
      console.log("[analyze-receipt] imageUrl ile analiz (fallback)");
      const result = await analyzeReceiptFromUrl(imageUrl);
      response = result;
      console.log("[analyze-receipt] Claude'dan dönen:", JSON.stringify(result));
      return NextResponse.json(result ?? { error: "OKUNAMADI" });
    }

    console.log("[analyze-receipt] Hatalı istek: base64+mediaType veya imageUrl gerekli");
    return NextResponse.json(
      { error: "base64 ve mediaType veya imageUrl gerekli" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[analyze-receipt] Claude error:", error);
    console.error("[analyze-receipt] Response (varsa):", response);
    return NextResponse.json(
      { error: "Fiş analiz edilemedi." },
      { status: 500 }
    );
  }
}
