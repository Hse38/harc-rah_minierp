import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildExcelBuffer } from "@/lib/excel-export";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const idsParam = searchParams.get("ids");

    const supabase = createAdminClient();
    let list: { submitter_name: string; iban: string; expense_number: string }[];

    if (idsParam && idsParam.trim()) {
      const ids = idsParam.trim().split(",").filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: "En az bir id gerekli" }, { status: 400 });
      }
      const { data, error } = await supabase
        .from("expenses")
        .select("submitter_name, iban, expense_number")
        .in("id", ids)
        .in("status", ["approved_koord", "paid"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      list = (data ?? []) as { submitter_name: string; iban: string; expense_number: string }[];
    } else {
      if (!start || !end) {
        return NextResponse.json(
          { error: "start ve end (YYYY-MM-DD) veya ids gerekli" },
          { status: 400 }
        );
      }
      const startDate = `${start}T00:00:00.000Z`;
      const endDate = `${end}T23:59:59.999Z`;
      const { data, error } = await supabase
        .from("expenses")
        .select("submitter_name, iban, expense_number")
        .in("status", ["approved_koord", "paid"])
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: true });
      if (error) throw error;
      list = (data ?? []) as { submitter_name: string; iban: string; expense_number: string }[];
    }

    const buffer = await buildExcelBuffer(list);
    const filename = idsParam
      ? `harcirah_secili_${Date.now()}.xlsx`
      : `harcirah_${start}_${end}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("export-excel", e);
    return NextResponse.json(
      { error: "Excel oluşturulamadı." },
      { status: 500 }
    );
  }
}
