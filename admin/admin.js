/* Página de um produto no painel: /admin/<produto> (local: ?produto=<id>) */
(function () {
  var m = location.pathname.match(/\/admin\/([^\/.]+)\/?$/);
  var id = m ? m[1] : new URLSearchParams(location.search).get("produto");
  var produto = window.SELLFY.produtos[id];
  if (!produto) { location.replace("/admin"); return; }

  var $ = function (x) { return document.getElementById(x); };
  var ICONES = {
    link: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    msg: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
    olho: '<svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    ok: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  document.title = produto.sigla + " · Painel de Avaliações | Sellfy Group";
  $("eyebrow").textContent = produto.sigla + " · " + produto.pesquisas.length + " pesquisas";
  $("titulo").textContent = produto.nome;
  $("descricao").textContent = produto.descricao;

  function link(p, preview) {
    var u = new URL("/avaliacao/" + produto.id + "/" + p.slug, location.origin);
    var empresa = $("empresa").value.trim();
    if (empresa) u.searchParams.set("empresa", empresa);
    if (preview) u.searchParams.set("preview", "1");
    return u.toString();
  }

  function mensagem(p) {
    var empresa = $("empresa").value.trim();
    return "Olá" + (empresa ? ", time " + empresa : "") + "! Tudo bem?\n\n" +
      "Concluímos " + (produto.formato === "etapas" ? "a " + p.ordem + " (" + p.titulo + ")" : (p.final ? "a entrega completa" : "o " + p.ordem + " (" + p.titulo + ")")) +
      " do " + produto.sigla + ". Sua opinião é muito importante pra gente e leva menos de 1 minuto:\n\n" +
      link(p) + "\n\nObrigado!";
  }

  var toastTimer;
  function toast(txt) {
    $("toast").textContent = txt; $("toast").classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { $("toast").classList.remove("show"); }, 2200);
  }

  function copiar(texto, btn, aviso) {
    var feito = function () {
      var orig = btn.innerHTML;
      btn.classList.add("ok"); btn.innerHTML = ICONES.ok + "Copiado";
      setTimeout(function () { btn.classList.remove("ok"); btn.innerHTML = orig; }, 1600);
      toast(aviso);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(texto).then(feito, function () { fallback(texto); feito(); });
    } else { fallback(texto); feito(); }
  }
  function fallback(texto) {
    var t = document.createElement("textarea");
    t.value = texto; t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
  }

  var lista = $("lista");
  function render() {
    lista.innerHTML = "";
    produto.pesquisas.forEach(function (p) {
      var num = (p.ordem.match(/\d+/) || [""])[0];
      var rotuloNum = p.final ? "Final" : p.ordem.replace(/\s*\d+$/, "");
      var el = document.createElement("article");
      el.className = "item" + (p.final ? " final" : "");
      el.innerHTML =
        '<div class="num"><b>' + (num || "✓") + "</b><span>" + rotuloNum + "</span></div>" +
        '<div class="info">' +
          '<div class="linha1"><h3></h3><span class="badge ' + p.tipo + '">' + p.tipo.toUpperCase() + "</span>" +
          (p.pendente ? '<span class="badge aviso">Nome a definir</span>' : "") + "</div>" +
          (p.detalhe ? '<div class="detalhe"></div>' : "") +
          '<div class="url"></div>' +
        "</div>" +
        '<div class="acoes">' +
          '<button type="button" class="btn primario" data-a="link">' + ICONES.link + "Copiar link</button>" +
          '<button type="button" class="btn" data-a="msg">' + ICONES.msg + "Copiar mensagem</button>" +
          '<a class="btn" data-a="prev" target="_blank" rel="noopener">' + ICONES.olho + "Prévia</a>" +
        "</div>";
      el.querySelector("h3").textContent = p.titulo;
      if (p.detalhe) el.querySelector(".detalhe").textContent = p.detalhe;
      el.querySelector(".url").textContent = link(p);
      el.querySelector(".url").title = link(p);
      el.querySelector('[data-a="prev"]').href = link(p, true);
      el.querySelector('[data-a="link"]').addEventListener("click", function () {
        copiar(link(p), this, "Link de " + p.ordem + " copiado");
      });
      el.querySelector('[data-a="msg"]').addEventListener("click", function () {
        copiar(mensagem(p), this, "Mensagem pronta para colar no WhatsApp/e-mail");
      });
      lista.appendChild(el);
    });
  }

  $("empresa").addEventListener("input", render);
  render();
})();
