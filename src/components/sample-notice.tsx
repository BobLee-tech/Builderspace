import { isSupabaseConfigured } from "@/lib/supabase/client";

/** Flags sample content so it is never mistaken for real activity. */
export function SampleNotice() {
  if (isSupabaseConfigured()) return null;
  return <span className="tag sample">示例数据 · 未连接 Supabase</span>;
}
