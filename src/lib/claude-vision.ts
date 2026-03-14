import Anthropic from "@anthropic-ai/sdk";
import type { ExpenseType } from "@/types";
import type { ReceiptAnalysis } from "@/types";

const ALLOWED_CATEGORIES: ExpenseType[] = [
  "Ulaşım",
  "Konaklama",
  "Yemek",
  "Malzeme",
  "Diğer",
];

const RECEIPT_PROMPT = `Bu bir Türk perakende fişi. Görseli dikkatlice analiz et.
Şu bilgileri çıkar ve SADECE JSON döndür, başka hiçbir şey yazma:
{
  "tutar": 570.00,
  "tarih": "2026-03-10",
  "isletme": "İpek Pişmaniye",
  "kategori": "Diğer",
  "aciklama": "İpek Pişmaniye alışverişi"
}
Kurallar:
- tutar: TOPLAM yazan rakam, sayı olarak (nokta ondalık ayracı).
- tarih: YYYY-MM-DD formatında.
- kategori: Sadece şunlardan biri: Ulaşım, Konaklama, Yemek, Malzeme, Diğer.
- Görsel bulanık bile olsa okumaya çalış.
- Hiç okuyamazsan: {"error": "OKUNAMADI"}
Başka metin yazma, sadece JSON.`;

function normalizeCategory(raw: string): ExpenseType {
  const lower = raw?.trim().toLowerCase() || "";
  if (lower.includes("ulaşım") || lower.includes("ulasim")) return "Ulaşım";
  if (lower.includes("konaklama")) return "Konaklama";
  if (lower.includes("yemek")) return "Yemek";
  if (lower.includes("malzeme")) return "Malzeme";
  return "Diğer";
}

function normalizeParsedReceipt(parsed: ReceiptAnalysis & { kategori?: string }): ReceiptAnalysis | null {
  if (parsed.error === "OKUNAMADI") return null;
  const kategori = parsed.kategori
    ? normalizeCategory(parsed.kategori)
    : "Diğer";
  return {
    tutar: typeof parsed.tutar === "number" ? parsed.tutar : undefined,
    tarih: typeof parsed.tarih === "string" ? parsed.tarih : undefined,
    isletme: typeof parsed.isletme === "string" ? parsed.isletme : undefined,
    kategori: ALLOWED_CATEGORIES.includes(kategori) ? kategori : "Diğer",
    aciklama:
      typeof parsed.aciklama === "string"
        ? parsed.aciklama.slice(0, 50)
        : undefined,
  };
}

export async function analyzeReceiptFromBase64(
  base64: string,
  mediaType: string
): Promise<ReceiptAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  console.log("[claude-vision] key başlangıç:", apiKey?.substring(0, 15));

  if (!apiKey) throw new Error("ANTHROPIC_API_KEY eksik");

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
  const safeMediaType = allowedTypes.includes(mediaType as typeof allowedTypes[number])
    ? (mediaType as typeof allowedTypes[number])
    : "image/jpeg";

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: safeMediaType,
              data: base64,
            },
          },
          { type: "text", text: RECEIPT_PROMPT },
        ],
      },
    ],
  });

  const block = response.content[0];
  const text = block.type === "text" ? block.text : "";
  console.log("[claude-vision] Ham yanıt:", text);

  let parsed: ReceiptAnalysis & { kategori?: string };
  try {
    parsed = JSON.parse(text.trim()) as ReceiptAnalysis & { kategori?: string };
  } catch {
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    console.log("[claude-vision] Temizlenmiş yanıt:", cleaned);
    try {
      parsed = JSON.parse(cleaned) as ReceiptAnalysis & { kategori?: string };
    } catch {
      console.log("[claude-vision] Parse hatası, ham metin:", text);
      return { error: "PARSE_ERROR", raw: text };
    }
  }

  return normalizeParsedReceipt(parsed);
}

export async function analyzeReceiptFromUrl(
  imageUrl: string
): Promise<ReceiptAnalysis | null> {
  const res = await fetch(imageUrl);
  if (!res.ok) return { error: "OKUNAMADI" };
  const buffer = await res.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const contentType =
    res.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  return analyzeReceiptFromBase64(base64, contentType);
}
