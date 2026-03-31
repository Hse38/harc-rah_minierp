/** Tüm expense list/detail sorgularında kullan; select("*") yerine bunu kullan. */
export const EXPENSE_FIELDS_FULL =
  "id,expense_number,submitter_id,submitter_name,iban,il,bolge,expense_type,amount,description,receipt_url,ai_analysis,manuel_giris,eski_fis,fis_hash,kategori_detay,status,bolge_note,bolge_warning,reviewed_by_bolge,reviewed_by_koord,reviewed_at_bolge,reviewed_at_koord,created_at";

/** Form sayfalarında profil için (iban, role, il, bolge). */
export const PROFILE_FIELDS_FORM = "id,full_name,iban,role,il,bolge";
