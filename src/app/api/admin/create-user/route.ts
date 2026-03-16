import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureAdmin } from "../ensure-admin";

export async function POST(request: Request) {
  const out = await ensureAdmin(request);
  if (out[2]) return out[2];
  const [supabase] = out;
  const admin = createAdminClient();
  const body = await request.json();
  const {
    email,
    password,
    full_name,
    role,
    il,
    bolge,
    iban,
    phone,
  } = body as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
    il?: string | null;
    bolge?: string | null;
    iban?: string | null;
    phone?: string | null;
  };

  if (!email || !password || !full_name || !role) {
    return NextResponse.json(
      { error: "email, password, full_name ve role zorunludur" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Şifre en az 8 karakter olmalıdır" },
      { status: 400 }
    );
  }

  const { data: newUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }
  if (!newUser.user) {
    return NextResponse.json({ error: "Kullanıcı oluşturulamadı" }, { status: 400 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: newUser.user.id,
    full_name: full_name,
    role,
    il: il || null,
    bolge: bolge || null,
    iban: iban || null,
    phone: phone || null,
  });

  if (profileError) {
    return NextResponse.json(
      { error: "Profil oluşturulamadı: " + profileError.message },
      { status: 400 }
    );
  }

  const { data: { user } } = await supabase!.auth.getUser();
  const adminName = (user?.user_metadata?.full_name as string) || "Admin";
  await admin.from("system_logs").insert({
    user_id: user?.id ?? null,
    user_name: adminName,
    action: "user_created",
    target_type: "user",
    target_id: newUser.user.id,
    details: { email, role, full_name },
  });

  return NextResponse.json({ success: true, userId: newUser.user.id });
}
