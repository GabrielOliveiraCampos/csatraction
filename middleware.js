/* Protege o painel (/admin) com usuário e senha (HTTP Basic Auth).
   Os links de avaliação (/avaliacao/...) continuam públicos.

   Configure na Vercel → Project → Settings → Environment Variables:
     ADMIN_USER      (ex.: sellfy)
     ADMIN_PASSWORD  (uma senha forte)
   e faça um novo deploy. Sem essas variáveis o painel fica bloqueado. */

export const config = {
  matcher: ["/", "/admin", "/admin/:path*"],
};

export default function middleware(request) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;

  if (!user || !pass) {
    return new Response("Painel bloqueado: configure ADMIN_USER e ADMIN_PASSWORD na Vercel.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    const [u, ...resto] = atob(auth.slice(6)).split(":");
    if (u === user && resto.join(":") === pass) {
      // segue para a página normalmente
      return new Response(null, { headers: { "x-middleware-next": "1" } });
    }
  }

  return new Response("Acesso restrito ao time Sellfy Group.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Painel Sellfy", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
