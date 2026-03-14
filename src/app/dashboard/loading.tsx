export default function DashboardLoading() {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center bg-slate-50 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
      <p className="text-sm text-slate-500 mt-3">Yükleniyor...</p>
    </div>
  );
}
