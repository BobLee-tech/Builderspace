import { isSupabaseConfigured } from "@/lib/supabase/client";
import { T } from "./t";

/** Flags sample content so it is never mistaken for real activity. */
export function SampleNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <span className="tag sample">
      <T
        zh="示例数据 · 未连接 Supabase"
        en="Sample data · Supabase not connected"
      />
    </span>
  );
}
