"use client";

/** Client helper: POST /api/notify (single recipient or toRole). Returns fetch Response for debugging. */
export async function notifyApi(
  body:
    | {
        recipientId: string;
        recipientRole: string;
        expenseId?: string | null;
        message: string;
        pushTitle: string;
        pushBody: string;
        pushUrl: string;
      }
    | {
        toRole: string;
        bolge?: string;
        expenseId?: string | null;
        message: string;
        pushTitle: string;
        pushBody: string;
        pushUrl: string;
      }
): Promise<Response | null> {
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      // body yoksa yut
    }
    console.log("[notifyApi] status:", res.status, json);
    return res;
  } catch (e) {
    console.error("notifyApi fetch error:", e);
    return null;
  }
}
