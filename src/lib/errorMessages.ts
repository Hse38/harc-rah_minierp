type AnyError = unknown;

function asMessage(err: AnyError): string {
  if (!err) return "";
  if (typeof err === "string") return err;
  if (typeof err === "object" && "message" in err) return String((err as { message?: unknown }).message ?? "");
  return String(err);
}

function asCode(err: AnyError): string {
  if (!err || typeof err !== "object") return "";
  const code = (err as { code?: unknown }).code;
  return code == null ? "" : String(code);
}

export function getUserFriendlyErrorMessage(err: AnyError): string {
  const msg = asMessage(err);
  const code = asCode(err);
  const lower = msg.toLowerCase();

  // Schema cache / missing column (PostgREST)
  if (
    lower.includes("schema cache") ||
    lower.includes("could not find the") && lower.includes("column") ||
    lower.includes("pgrst") && lower.includes("column")
  ) {
    return "Sistem güncelleniyor, lütfen sayfayı yenileyin.";
  }

  // Auth / session
  if (
    lower.includes("unauthorized") ||
    lower.includes("jwt") ||
    lower.includes("invalid login credentials") ||
    lower.includes("auth") && lower.includes("token")
  ) {
    return "Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.";
  }

  // Permission
  if (lower.includes("forbidden") || lower.includes("insufficient_privilege")) {
    return "Bu işlem için yetkiniz bulunmuyor.";
  }

  // Network
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("connection") && lower.includes("failed")
  ) {
    return "Bağlantı hatası. İnternet bağlantınızı kontrol edin.";
  }

  // Duplicate / unique
  if (code === "23505" || lower.includes("duplicate key") || lower.includes("already exists")) {
    return "Bu kayıt zaten mevcut.";
  }

  // Default
  return "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.";
}

export function getUserFriendlyApiErrorMessage(payload: unknown, fallback?: string): string {
  const p = payload as { error?: unknown } | null;
  const err = p?.error;
  if (err) return getUserFriendlyErrorMessage(err);
  return fallback ?? "Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.";
}

