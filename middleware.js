/* Protege o painel (/admin) com uma tela de login da Sellfy.
   Os links de avaliação (/avaliacao/...) continuam públicos.

   Configure na Vercel → Project → Settings → Environment Variables:
     ADMIN_USER      (ex.: sellfy)
     ADMIN_PASSWORD  (uma senha forte)
   e faça um novo deploy. Depois do login, o navegador lembra por 30 dias. */

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};

const COOKIE = "sellfy_painel";
const TRINTA_DIAS = 60 * 60 * 24 * 30;

async function assinatura(user, pass) {
  const dados = new TextEncoder().encode("sellfy-painel|" + user + "|" + pass);
  const hash = await crypto.subtle.digest("SHA-256", dados);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function lerCookie(request, nome) {
  const linha = request.headers.get("cookie") || "";
  const par = linha.split(/;\s*/).find((c) => c.startsWith(nome + "="));
  return par ? par.slice(nome.length + 1) : "";
}

function html(corpo, status) {
  return new Response(corpo, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function telaLogin(erro) {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Entrar | Painel Sellfy</title>
<link rel="icon" href="/assets/logo-sellfy.png">
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#0C0F12;color:#F1F0EB;font-family:Inter,system-ui,sans-serif}
.card{width:100%;max-width:380px;background:#15191D;border:1px solid #262C32;border-radius:22px;padding:32px 28px}
.marca{display:flex;align-items:center;gap:12px;margin-bottom:26px}
.marca img{width:44px;height:44px;border-radius:12px}
.marca b{font-family:"Bebas Neue",sans-serif;font-weight:400;font-size:24px;letter-spacing:.04em;line-height:1}
.marca span{display:block;font-size:12px;color:#9AA1A8;margin-top:2px}
h1{font-family:"Bebas Neue",sans-serif;font-weight:400;font-size:44px;line-height:.95}
p.sub{color:#9AA1A8;font-size:14px;margin:8px 0 22px}
label{display:block;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#9AA1A8;margin:14px 0 7px}
input{width:100%;background:#0C0F12;border:1.5px solid #262C32;color:#F1F0EB;border-radius:12px;padding:13px 14px;font:inherit;font-size:15px}
input:focus{outline:none;border-color:#FF5319}
button{width:100%;margin-top:22px;background:#FF5319;color:#fff;border:0;border-radius:12px;padding:14px;font:inherit;font-size:15px;font-weight:600;cursor:pointer}
button:hover{background:#E0420C}
.erro{background:rgba(217,58,43,.12);border:1px solid rgba(217,58,43,.45);color:#ffb4ab;border-radius:12px;padding:11px 14px;font-size:13.5px;margin-bottom:6px}
</style></head><body>
<form class="card" method="POST" action="/admin/entrar">
  <div class="marca"><img src="/assets/logo-sellfy.png" alt=""><div><b>Sellfy Group</b><span>Painel de avaliações</span></div></div>
  <h1>Acesso do time</h1>
  <p class="sub">Entre para gerar os links de avaliação dos clientes.</p>
  ${erro ? `<div class="erro">${erro}</div>` : ""}
  <label for="u">Usuário</label><input id="u" name="usuario" autocomplete="username" autocapitalize="none" required autofocus>
  <label for="s">Senha</label><input id="s" name="senha" type="password" autocomplete="current-password" required>
  <button type="submit">Entrar</button>
</form></body></html>`;
}

export default async function middleware(request) {
  const user = (process.env.ADMIN_USER || "").trim();
  const pass = (process.env.ADMIN_PASSWORD || "").trim();
  const url = new URL(request.url);

  if (!user || !pass) {
    return html(telaLogin("Painel bloqueado: configure ADMIN_USER e ADMIN_PASSWORD na Vercel e publique de novo."), 503);
  }
  const esperado = await assinatura(user, pass);

  if (url.pathname === "/admin/sair") {
    return new Response(null, { status: 302, headers: {
      Location: "/admin", "Set-Cookie": `${COOKIE}=; Path=/admin; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (url.pathname === "/admin/entrar") {
    if (request.method !== "POST") return Response.redirect(new URL("/admin", url), 302);
    const form = await request.formData();
    const u = String(form.get("usuario") || "").trim();
    const s = String(form.get("senha") || "").trim();
    if (u === user && s === pass) {
      return new Response(null, { status: 303, headers: {
        Location: "/admin",
        "Set-Cookie": `${COOKIE}=${esperado}; Path=/admin; Max-Age=${TRINTA_DIAS}; HttpOnly; Secure; SameSite=Lax` } });
    }
    return html(telaLogin("Usuário ou senha incorretos."), 401);
  }

  if (lerCookie(request, COOKIE) === esperado) {
    // segue para a página normalmente
    return new Response(null, { headers: { "x-middleware-next": "1" } });
  }
  return html(telaLogin(""), 401);
}
