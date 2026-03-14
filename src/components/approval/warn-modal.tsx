"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function WarnModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (message: string) => void | Promise<void>;
  loading?: boolean;
}) {
  const [message, setMessage] = useState("");

  async function handleConfirm() {
    await onConfirm(message);
    setMessage("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showClose={true}>
        <DialogHeader>
          <DialogTitle>Uyarılı onay</DialogTitle>
          <DialogDescription>
            Kişiye gösterilecek uyarı mesajını yazın. Onayladıktan sonra bu mesaj
            harcamayı gönderen kişiye görünecektir.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="warn-msg">Uyarı mesajı</Label>
          <Textarea
            id="warn-msg"
            placeholder="Örn: Fiş tarihi ile harcama tarihi uyuşmuyor, lütfen dikkat edin."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            İptal
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "İşleniyor..." : "Uyarılı onayla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
