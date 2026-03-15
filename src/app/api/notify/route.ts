import { NextResponse } from "next/server";
import { sendNotification, sendNotificationToRole } from "@/lib/send-notification";

type NotifyBody =
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
    };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifyBody;

    if ("recipientId" in body && body.recipientId) {
      await sendNotification({
        recipientId: body.recipientId,
        recipientRole: body.recipientRole,
        expenseId: body.expenseId,
        message: body.message,
        pushTitle: body.pushTitle,
        pushBody: body.pushBody,
        pushUrl: body.pushUrl,
      });
      return NextResponse.json({ ok: true });
    }

    if ("toRole" in body && body.toRole) {
      await sendNotificationToRole(body.toRole, {
        expenseId: body.expenseId,
        message: body.message,
        pushTitle: body.pushTitle,
        pushBody: body.pushBody,
        pushUrl: body.pushUrl,
        ...(body.bolge != null && { bolge: body.bolge }),
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "recipientId or toRole required" }, { status: 400 });
  } catch (e) {
    console.error("notify", e);
    return NextResponse.json({ error: "Notify failed" }, { status: 500 });
  }
}
