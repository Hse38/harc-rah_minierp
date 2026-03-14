import type { ReceiptAnalysis } from "@/types";
import { formatCurrency } from "@/lib/utils";

export function AiAnalysisBox({
  analysis,
  onUseManual,
}: {
  analysis: ReceiptAnalysis | null;
  onUseManual?: () => void;
}) {
  if (!analysis || analysis.error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          Fiş okunamadı, lütfen bilgileri elle girin.
        </p>
        {onUseManual && (
          <button
            type="button"
            onClick={onUseManual}
            className="mt-2 text-sm font-medium text-amber-700 underline"
          >
            Elle gireceğim
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        AI Fiş Analizi
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {analysis.tutar != null && (
          <div>
            <span className="text-slate-500">Tutar: </span>
            <span className="font-medium">{formatCurrency(analysis.tutar)}</span>
          </div>
        )}
        {analysis.tarih && (
          <div>
            <span className="text-slate-500">Tarih: </span>
            <span className="font-medium">{analysis.tarih}</span>
          </div>
        )}
        {analysis.isletme && (
          <div className="col-span-2">
            <span className="text-slate-500">İşletme: </span>
            <span className="font-medium">{analysis.isletme}</span>
          </div>
        )}
        {analysis.kategori && (
          <div>
            <span className="text-slate-500">Kategori: </span>
            <span className="font-medium">{analysis.kategori}</span>
          </div>
        )}
        {analysis.aciklama && (
          <div className="col-span-2">
            <span className="text-slate-500">Açıklama: </span>
            <span className="font-medium">{analysis.aciklama}</span>
          </div>
        )}
      </div>
      {onUseManual && (
        <button
          type="button"
          onClick={onUseManual}
          className="text-sm text-slate-600 underline mt-2"
        >
          Fiş okunamıyor, elle gireceğim
        </button>
      )}
    </div>
  );
}
