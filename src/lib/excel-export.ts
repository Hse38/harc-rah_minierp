import ExcelJS from "exceljs";
import type { Expense } from "@/types";

export async function buildExcelBuffer(
  expenses: Pick<Expense, "submitter_name" | "iban" | "expense_number">[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("TAMGA", { views: [{ state: "frozen", ySplit: 1 }] });

  const headers = ["Ad Soyad", "IBAN", "Açıklama"];
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.height = 22;

  for (const e of expenses) {
    ws.addRow([
      e.submitter_name,
      e.iban || "",
      `${e.expense_number} numaralı masraf için ödeme`,
    ]);
  }

  const colWidths = [25, 30, 50];
  ws.columns.forEach((col, i) => {
    col.width = colWidths[i] ?? 15;
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
