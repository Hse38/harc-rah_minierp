export default function DashboardLoading() {
  return (
    <div className="min-h-[40vh] bg-slate-50 p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="h-8 w-24 animate-pulse bg-gray-200 rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 lg:h-28 animate-pulse bg-gray-200 rounded-xl"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse bg-gray-200 rounded-xl" />
      <div className="flex items-center justify-center py-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#2563EB]" />
        <p className="text-sm text-slate-500 mt-3 ml-3">Yükleniyor...</p>
      </div>
    </div>
  );
}
