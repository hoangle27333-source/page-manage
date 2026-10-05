import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeProfile } from "@/lib/scraper/scraper-adapter";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const db = await createClient();
    const { data: account, error } = await db.from("tracked_accounts").select("*").eq("id", id).single();
    if (error || !account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const scraped = await scrapeProfile(account.platform as "facebook" | "instagram", account.profile_url);
    await db.from("tracked_accounts").update({
      followers_count: scraped.followersCount ?? 0,
      bio: scraped.bio ?? null,
      avatar_url: scraped.avatarUrl ?? null,
      last_scraped_at: new Date().toISOString(),
      status: "active",
    }).eq("id", id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
