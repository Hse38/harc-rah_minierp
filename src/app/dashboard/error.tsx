"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
      <p className="text-sm text-red-800">Bir hata oluştu.</p>
      <Button variant="outline" size="sm" className="mt-3" onClick={reset}>
        Tekrar dene
      </Button>
    </div>
  );
}
