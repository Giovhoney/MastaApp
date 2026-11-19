/** Liveness only. Never return credentials, database addresses or inventory data. */
export async function GET() {
  return Response.json({ status: "ok", productionReady: false }, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
