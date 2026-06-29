export async function onRequest(ctx) {
  return new Response(JSON.stringify({status: "ok", message: "hello"}), {
    headers: {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}
  });
}
