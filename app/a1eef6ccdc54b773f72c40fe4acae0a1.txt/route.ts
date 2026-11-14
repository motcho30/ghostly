import { INDEXNOW_KEY } from "@/lib/seo/indexnow";

export function GET() {
  return new Response(INDEXNOW_KEY, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
