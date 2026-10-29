/* Mostra um aviso no painel enquanto o backend (planilha) não estiver configurado. */
(function () {
  if (window.SELLFY.endpoint) return;
  var el = document.createElement("div");
  el.className = "alerta";
  el.innerHTML = "<b>Planilha não conectada.</b> As respostas ainda não estão sendo gravadas. " +
    "Cole a URL do Apps Script em <code>assets/pesquisas.js</code> antes de enviar links para clientes.";
  var topo = document.querySelector(".topo");
  topo.parentNode.insertBefore(el, topo.nextSibling);
})();
