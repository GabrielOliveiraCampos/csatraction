/* Formulário do cliente — lê /avaliacao/<produto>/<slug> e monta a pesquisa.
   Fora da Vercel (teste local) também aceita ?p=<produto>/<slug>. */
(function () {
  var params = new URLSearchParams(location.search);
  var preview = params.get("preview") === "1";

  function rota() {
    var m = location.pathname.match(/\/avaliacao\/([^\/]+)\/([^\/]+)\/?$/);
    if (m) return [m[1], m[2]];
    var p = (params.get("p") || "").split("/");
    return p.length === 2 ? p : [];
  }

  var r = rota();
  var achado = r.length ? window.SELLFY.buscar(r[0], r[1]) : null;
  if (!achado) {
    document.getElementById("invalido").hidden = false;
    document.title = "Link não encontrado | Sellfy Group";
    return;
  }

  var produto = achado.produto, pesquisa = achado.pesquisa;
  var isNps = pesquisa.tipo === "nps";
  var $ = function (id) { return document.getElementById(id); };

  var ROTULOS = ["Muito insatisfeito", "Insatisfeito", "Neutro", "Satisfeito", "Muito satisfeito"];
  var EMOJIS = ["😡", "🙁", "😐", "🙂", "🔔"];
  var DESTAQUES = ["Clareza estratégica", "Qualidade das entregas", "Expertise do time",
    "Comunicação e acompanhamento", "Resultados gerados", "Agilidade"];

  var nota = null, destaquesSel = [];

  /* ---------- Cabeçalho e textos ---------- */
  document.title = pesquisa.titulo + " · " + produto.sigla + " | Sellfy Group";
  $("card").hidden = false;
  $("prev-banner").hidden = !preview;
  $("tag").textContent = produto.sigla + " · " + (isNps ? "NPS" : "CSAT");
  $("eyebrow").textContent = pesquisa.ordem;
  $("titulo").textContent = pesquisa.titulo;
  if (pesquisa.detalhe) { $("detalhe").textContent = pesquisa.detalhe; $("detalhe").hidden = false; }

  var pergunta = pesquisa.pergunta || (isNps
    ? "Em uma escala de 0 a 10, o quanto você recomendaria o trabalho de <strong>" + pesquisa.titulo + "</strong> da Sellfy a um colega ou parceiro?"
    : "Quão satisfeito(a) você está com <strong>" + pesquisa.titulo + "</strong>?");
  $("pergunta").innerHTML = pergunta + ' <span class="req">*</span>';
  $("ext-min").textContent = isNps ? "0 · Não recomendaria" : "1 · Muito insatisfeito";
  $("ext-max").textContent = isNps ? "Recomendaria · 10" : "Muito satisfeito · 5";
  $("err-escala").textContent = isNps ? "Toque em uma nota de 0 a 10." : "Toque em uma das opções para dar sua nota.";

  var empresaUrl = params.get("empresa");
  if (empresaUrl) $("empresa").value = empresaUrl;

  /* ---------- Escala ---------- */
  var escala = $("escala");
  escala.className = "escala " + (isNps ? "nps" : "csat");
  var ini = isNps ? 0 : 1, fim = isNps ? 10 : 5;
  for (var i = ini; i <= fim; i++) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    if (isNps) {
      b.textContent = i;
      b.className = i <= 6 ? "det" : (i <= 8 ? "neu" : "pro");
      b.setAttribute("aria-label", "Nota " + i);
    } else {
      b.innerHTML = '<span class="emo">' + EMOJIS[i - 1] + '</span><span class="n">' + i + "</span>";
      b.setAttribute("aria-label", i + ": " + ROTULOS[i - 1]);
    }
    b.addEventListener("click", escolher.bind(null, i, b));
    escala.appendChild(b);
  }

  DESTAQUES.forEach(function (txt) {
    var c = document.createElement("button");
    c.type = "button"; c.className = "chip"; c.textContent = txt;
    c.setAttribute("aria-pressed", "false");
    c.addEventListener("click", function () {
      var on = c.getAttribute("aria-pressed") === "true";
      c.setAttribute("aria-pressed", on ? "false" : "true");
      destaquesSel = on ? destaquesSel.filter(function (x) { return x !== txt; }) : destaquesSel.concat(txt);
    });
    $("chips").appendChild(c);
  });

  function classifNps(v) { return v <= 6 ? "Detrator" : (v <= 8 ? "Neutro" : "Promotor"); }

  function escolher(val, btn) {
    nota = val;
    Array.prototype.forEach.call(escala.children, function (x) { x.setAttribute("aria-pressed", "false"); });
    btn.setAttribute("aria-pressed", "true");
    escala.classList.add("escolhido");
    $("err-escala").classList.remove("show");

    var t = $("fu-titulo"), s = $("fu-sub"), ml = $("motivo-label");
    var mostrarMotivo = true, mostrarDestaques = false, mostrarDepo = false;

    if (isNps) {
      $("selecao").textContent = "Nota " + val + " · " + classifNps(val);
      if (val <= 6) {
        t.textContent = "Queremos melhorar 🙏"; s.textContent = "Seu retorno é o que mais nos ajuda a evoluir.";
        ml.textContent = "O que mais pesou pra essa nota e o que podemos melhorar?";
      } else if (val <= 8) {
        t.textContent = "Quase lá!"; s.textContent = "Falta pouco pra ser uma experiência nota 10.";
        ml.textContent = "O que faltou pra você dar um 9 ou 10?";
      } else {
        t.textContent = "Que satisfação! 🔔"; s.textContent = "Obrigado por recomendar o nosso trabalho.";
        ml.textContent = "O que mais te marcou?"; mostrarDepo = true;
      }
    } else {
      $("selecao").textContent = val + " · " + ROTULOS[val - 1];
      if (val <= 3) {
        t.textContent = "Queremos melhorar isso 🙏"; s.textContent = "Seu retorno aqui é o que mais nos ajuda a corrigir a rota.";
        ml.textContent = pesquisa.final ? "O que aconteceu no " + produto.sigla + " e o que podemos fazer melhor?" : "O que aconteceu nesta etapa e o que podemos fazer melhor?";
      } else {
        t.textContent = "Que bom saber disso! 🎉"; s.textContent = "Nos conte o que mais fez a diferença pra você.";
        mostrarMotivo = false; mostrarDestaques = true; mostrarDepo = true;
      }
    }
    $("box-motivo").hidden = !mostrarMotivo;
    $("box-destaques").hidden = !mostrarDestaques;
    $("box-depo").hidden = !mostrarDepo;

    var f = $("follow");
    if (f.hidden) {
      f.hidden = false;
      setTimeout(function () { f.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
    }
  }

  /* ---------- Envio ---------- */
  function coletar() {
    return {
      token: window.SELLFY.token,
      produto: produto.sigla,
      pesquisa: pesquisa.ordem + " · " + pesquisa.titulo,
      tipo: isNps ? "NPS" : "CSAT",
      nota: nota,
      motivo: $("box-motivo").hidden ? "" : $("motivo").value.trim(),
      destaques: $("box-destaques").hidden ? "" : destaquesSel.join("; "),
      depoimento: $("box-depo").hidden ? "" : $("depoimento").value.trim(),
      nome: $("nome").value.trim(),
      empresa: $("empresa").value.trim(),
      data: new Date().toISOString()
    };
  }

  function exigir(id, errId) {
    var el = $(id);
    if (el.value.trim() === "") {
      $(errId).classList.add("show"); el.focus();
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    $(errId).classList.remove("show");
    return true;
  }

  $("form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (nota === null) {
      $("err-escala").classList.add("show");
      escala.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!exigir("nome", "err-nome") || !exigir("empresa", "err-empresa")) return;

    var dados = coletar();
    var btn = $("submit");
    btn.textContent = "Enviando..."; btn.disabled = true;

    function concluir() {
      $("form").hidden = true;
      $("thanks-msg").innerHTML = "Sua avaliação de <strong>" + pesquisa.titulo + "</strong> (" + produto.sigla +
        ") foi registrada. Isso nos ajuda a evoluir a cada etapa.";
      $("thanks").hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
      $("baixar").onclick = function () {
        var copia = Object.assign({}, dados); delete copia.token;
        var blob = new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = produto.id + "-" + pesquisa.slug + ".json";
        a.click();
      };
    }

    if (preview || !window.SELLFY.endpoint) { setTimeout(concluir, 400); return; }

    var corpo = new URLSearchParams();
    Object.keys(dados).forEach(function (k) { corpo.append(k, dados[k] == null ? "" : String(dados[k])); });
    fetch(window.SELLFY.endpoint, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo
    }).then(concluir, concluir);
  });
})();
