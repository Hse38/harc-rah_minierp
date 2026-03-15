"use client";

/** Client helper: POST /api/notify (single recipient or toRole). Fire-and-forget. */
export async function notifyApi(
  body:
    | {
        recipientId: string;
        recipientRole: string;
        expenseId: string;
        message: string;
        pushTitle: string;
        pushBody: string;
        pushUrl: string;
      }
    | {
        toRole: string;
        bolge?: string;
        expenseId: string;
        message: string;
        pushTitle: string;
        pushBody: string;
        pushUrl: string;
      }
): Promise<void> {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("notifyApi", e);
  }
}
