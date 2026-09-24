import { cookies } from "next/headers";
import { getDict, normalizeLang, type Dict, type Lang } from "./dictionaries";

// Server-side: baca bahasa dari cookie (default Indonesia).
export async function getLang(): Promise<Lang> {
  try {
    const store = await cookies();
    return normalizeLang(store.get("mr_lang")?.value);
  } catch {
    return "id";
  }
}

export async function getDictServer(): Promise<{ lang: Lang; t: Dict }> {
  const lang = await getLang();
  return { lang, t: getDict(lang) };
}

// Alias untuk Server Actions (baca cookie bahasa pemanggil).
export async function getActionDict(): Promise<Dict> {
  return (await getDictServer()).t;
}
