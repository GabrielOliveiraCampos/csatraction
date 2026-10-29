/**
 * SELLFY GROUP — Avaliações de Clientes (CSAT + NPS)
 * Backend único (Google Apps Script) para Scale, ICV, Traction e Journey.
 * ---------------------------------------------------------------
 * INSTALAÇÃO (uma vez só):
 *  1. Na planilha "Sellfy — Avaliações de Clientes": Extensões → Apps Script.
 *  2. Apague o conteúdo do Code.gs, cole este arquivo inteiro e salve.
 *  3. Selecione a função "configurar" e clique em ▶ Executar (autorize).
 *     → cria as abas Painel, Respostas, Follow-up e Depoimentos.
 *  4. Selecione "importarHistoricoTraction" e execute (uma vez).
 *     → traz as respostas reais da planilha antiga do Traction.
 *  5. Implantar → Nova implantação → Tipo: App da Web
 *     Executar como: Eu · Quem pode acessar: Qualquer pessoa
 *     → copie a URL /exec e cole em assets/pesquisas.js (BACKEND.endpoint).
 *
 * Ao editar este código depois: Implantar → Gerenciar implantações →
 * Editar → "Nova versão". Assim a URL /exec continua a mesma.
 * ---------------------------------------------------------------
 */

// ================= CONFIGURAÇÃO =================
var TOKEN_ESPERADO = '3855f313-111b-474f-afcf-f78503873d19'; // o mesmo de assets/pesquisas.js
var ALERTA_EMAILS = 'gabriel@sellfygroup.com';              // separe vários com vírgula; '' desliga
var PLANILHA_ANTIGA_TRACTION = '1mzPB-m-8gtwqlsPsObIeLK1Na73kq_B-l6QrUkewPVg';

// Pesquisas que aparecem no Painel (mesma ordem do site).
// Ao criar uma pesquisa nova no site, adicione aqui e rode "configurar" de novo.
var CATALOGO = [
  { produto: 'Scale', pesquisas: pilares_() },
  { produto: 'ICV', pesquisas: pilares_() },
  { produto: 'Traction', pesquisas: [
    ['Etapa 1 · Pré-venda', 'CSAT'], ['Etapa 2 · Geração de Demanda', 'CSAT'], ['Etapa 3 · Venda', 'CSAT']] },
  { produto: 'Journey', pesquisas: [
    ['Etapa 1 · Produção de Conteúdo', 'CSAT'], ['Etapa 2 · Pré-vendas', 'CSAT'], ['Etapa 3 · Vendas', 'CSAT']] }
];
function pilares_() {
  return [
    ['Pilar 1 · Auditoria Comercial', 'NPS'], ['Pilar 2 · Calendário da Cultura', 'NPS'],
    ['Pilar 3 · Engenharia de Oportunidades', 'NPS'], ['Pilar 4 · Arquitetura do Sim', 'NPS'],
    ['Pilar 5 · Governança Comercial', 'NPS'], ['Pilar 6 · Pilar 6', 'NPS'],
    ['Entrega final · Entrega Completa', 'CSAT']
  ];
}
// ==================================================

var ABA_PAINEL = 'Painel', ABA_RESPOSTAS = 'Respostas', ABA_FOLLOW = 'Follow-up', ABA_DEPO = 'Depoimentos';
var COLS_RESPOSTAS = ['ID', 'Data', 'Produto', 'Pesquisa', 'Tipo', 'Nota', 'Classificação',
  'Comentário', 'Destaques', 'Depoimento', 'Nome', 'Empresa', 'Origem'];
var COLS_FOLLOW = ['Data', 'Produto', 'Pesquisa', 'Nota', 'Classificação', 'Comentário',
  'Nome', 'Empresa', 'Status', 'Responsável', 'Observações', 'ID'];

var COR = { laranja: '#FF5319', carvao: '#0C0F12', creme: '#F1F0EB', creme2: '#E7E5DD',
  cinza: '#5F625F', verde: '#24965A', verdeClaro: '#DDF1E5', vermelho: '#D93A2B',
  vermelhoClaro: '#FBE1DE', amarelo: '#E9A53A', amareloClaro: '#FCEFD9', branco: '#FFFFFF' };

/* ======================= RECEBER RESPOSTAS ======================= */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var p = (e && e.parameter) ? e.parameter : {};
    if (p.token !== TOKEN_ESPERADO) return json_({ ok: false, erro: 'token_invalido' });

    var tipo = String(p.tipo || '').toUpperCase();
    var nota = Number(p.nota);
    if (tipo !== 'CSAT' && tipo !== 'NPS') return json_({ ok: false, erro: 'tipo_invalido' });
    if (p.nota === undefined || p.nota === '' || isNaN(nota) ||
        (tipo === 'CSAT' && (nota < 1 || nota > 5)) || (tipo === 'NPS' && (nota < 0 || nota > 10))) {
      return json_({ ok: false, erro: 'nota_fora_do_intervalo' });
    }

    registrar_({
      data: new Date(), produto: p.produto, pesquisa: p.pesquisa, tipo: tipo, nota: nota,
      comentario: p.motivo, destaques: p.destaques, depoimento: p.depoimento,
      nome: p.nome, empresa: p.empresa, origem: 'Site'
    }, true);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function registrar_(r, avisar) {
  var ss = planilha_();
  var id = Utilities.getUuid();
  var classe = classificar_(r.tipo, r.nota);
  ss.getSheetByName(ABA_RESPOSTAS).appendRow([
    id, r.data, r.produto || '', r.pesquisa || '', r.tipo, r.nota, classe,
    r.comentario || '', r.destaques || '', r.depoimento || '', r.nome || '', r.empresa || '', r.origem
  ]);

  if (precisaFollowUp_(r.tipo, r.nota) && r.origem === 'Site') {
    ss.getSheetByName(ABA_FOLLOW).appendRow([
      r.data, r.produto || '', r.pesquisa || '', r.nota, classe, r.comentario || '',
      r.nome || '', r.empresa || '', 'Pendente', '', '', id
    ]);
    if (avisar) alertar_(r, classe);
  }
}

function classificar_(tipo, nota) {
  if (tipo === 'NPS') return nota <= 6 ? 'Detrator' : (nota <= 8 ? 'Neutro' : 'Promotor');
  return nota <= 2 ? 'Insatisfeito' : (nota === 3 ? 'Neutro' : 'Satisfeito');
}
function precisaFollowUp_(tipo, nota) { return tipo === 'NPS' ? nota <= 6 : nota <= 3; }

function alertar_(r, classe) {
  if (!ALERTA_EMAILS) return;
  try {
    var url = planilha_().getUrl() + '#gid=' + planilha_().getSheetByName(ABA_FOLLOW).getSheetId();
    MailApp.sendEmail({
      to: ALERTA_EMAILS,
      subject: '[Sellfy] Nota ' + r.nota + ' (' + classe + ') · ' + r.produto + ' · ' + (r.empresa || 'sem empresa'),
      htmlBody:
        '<p><b>' + esc_(r.nome) + '</b> (' + esc_(r.empresa) + ') avaliou <b>' + esc_(r.produto) + ' · ' +
        esc_(r.pesquisa) + '</b> com nota <b>' + r.nota + '</b> (' + r.tipo + ', ' + classe + ').</p>' +
        (r.comentario ? '<p>Comentário: <i>' + esc_(r.comentario) + '</i></p>' : '') +
        '<p><a href="' + url + '">Abrir aba Follow-up</a></p>'
    });
  } catch (err) { console.warn('Falha ao enviar alerta: ' + err); }
}

/* ======================= MONTAR A PLANILHA ======================= */

/** Rode uma vez (e de novo quando mudar o CATALOGO). Nunca apaga respostas. */
function configurar() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('PLANILHA_ID', ss.getId());
  ss.setSpreadsheetLocale('pt_BR');
  ss.setSpreadsheetTimeZone('America/Sao_Paulo');

  var resp = aba_(ss, ABA_RESPOSTAS);
  if (resp.getLastRow() === 0) resp.appendRow(COLS_RESPOSTAS);
  montarRespostas_(resp);

  var follow = aba_(ss, ABA_FOLLOW);
  if (follow.getLastRow() === 0) follow.appendRow(COLS_FOLLOW);
  montarFollow_(follow);

  montarDepoimentos_(aba_(ss, ABA_DEPO));
  montarPainel_(aba_(ss, ABA_PAINEL));

  // Ordem das abas e limpeza das abas vazias padrão
  [ABA_PAINEL, ABA_FOLLOW, ABA_DEPO, ABA_RESPOSTAS].forEach(function (n, i) {
    ss.setActiveSheet(ss.getSheetByName(n)); ss.moveActiveSheet(i + 1);
  });
  ss.getSheets().forEach(function (sh) {
    if ([ABA_PAINEL, ABA_FOLLOW, ABA_DEPO, ABA_RESPOSTAS].indexOf(sh.getName()) === -1 && sh.getLastRow() === 0) {
      ss.deleteSheet(sh);
    }
  });
  ss.setActiveSheet(ss.getSheetByName(ABA_PAINEL));
}

function montarRespostas_(sh) {
  estiloBase_(sh, COLS_RESPOSTAS.length);
  cabecalho_(sh.getRange(1, 1, 1, COLS_RESPOSTAS.length));
  sh.setFrozenRows(1);
  larguras_(sh, [90, 125, 85, 250, 60, 55, 105, 300, 230, 300, 160, 170, 80]);
  sh.hideColumns(1);
  sh.getRange('B2:B').setNumberFormat('dd/MM/yyyy HH:mm');
  sh.getRange('F2:F').setHorizontalAlignment('center');
  sh.getRange('H2:J').setWrap(true);
  sh.setConditionalFormatRules([
    regraTexto_(sh.getRange('G2:G'), ['Satisfeito', 'Promotor'], COR.verdeClaro, COR.verde),
    regraTexto_(sh.getRange('G2:G'), ['Neutro'], COR.amareloClaro, '#8A5A0B'),
    regraTexto_(sh.getRange('G2:G'), ['Insatisfeito', 'Detrator'], COR.vermelhoClaro, COR.vermelho)
  ]);
  if (!sh.getFilter()) sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), COLS_RESPOSTAS.length).createFilter();
}

function montarFollow_(sh) {
  estiloBase_(sh, COLS_FOLLOW.length);
  cabecalho_(sh.getRange(1, 1, 1, COLS_FOLLOW.length));
  sh.setFrozenRows(1);
  larguras_(sh, [125, 85, 250, 55, 105, 320, 160, 170, 120, 150, 280, 90]);
  sh.hideColumns(12);
  sh.getRange('A2:A').setNumberFormat('dd/MM/yyyy HH:mm');
  sh.getRange('D2:D').setHorizontalAlignment('center');
  sh.getRange('F2:F').setWrap(true);
  sh.getRange('K2:K').setWrap(true);
  sh.getRange('I2:I').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(['Pendente', 'Em contato', 'Resolvido'], true).setAllowInvalid(false).build());
  sh.setConditionalFormatRules([
    regraTexto_(sh.getRange('I2:I'), ['Pendente'], COR.vermelhoClaro, COR.vermelho),
    regraTexto_(sh.getRange('I2:I'), ['Em contato'], COR.amareloClaro, '#8A5A0B'),
    regraTexto_(sh.getRange('I2:I'), ['Resolvido'], COR.verdeClaro, COR.verde)
  ]);
  if (!sh.getFilter()) sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), COLS_FOLLOW.length).createFilter();
}

function montarDepoimentos_(sh) {
  limpar_(sh);
  estiloBase_(sh, 7);
  titulo_(sh, 'DEPOIMENTOS', 'Respostas com depoimento, da mais recente para a mais antiga. Atualiza sozinha.', 7);
  cabecalho_(sh.getRange(4, 1, 1, 7).setValues([['Data', 'Produto', 'Pesquisa', 'Nota', 'Depoimento', 'Nome', 'Empresa']]));
  sh.setFrozenRows(4);
  sh.getRange('A5').setFormula(
    '=IFERROR(SORT(FILTER({Respostas!B2:B,Respostas!C2:C,Respostas!D2:D,Respostas!F2:F,Respostas!J2:J,Respostas!K2:K,Respostas!L2:L},' +
    'Respostas!J2:J<>"",Respostas!M2:M<>"Teste"),1,FALSE),"Nenhum depoimento ainda")');
  larguras_(sh, [125, 85, 250, 55, 460, 160, 170]);
  sh.getRange('A5:A').setNumberFormat('dd/MM/yyyy');
  sh.getRange('D5:D').setHorizontalAlignment('center');
  sh.getRange('E5:E').setWrap(true);
}

function montarPainel_(sh) {
  // Guarda o período escolhido antes de redesenhar
  var ini = sh.getRange('C4').getValue(), fim = sh.getRange('E4').getValue();
  limpar_(sh); sh.setConditionalFormatRules([]);
  estiloBase_(sh, 9);
  sh.setHiddenGridlines(true);
  larguras_(sh, [24, 140, 290, 90, 110, 110, 90, 110, 120]);
  titulo_(sh, 'AVALIAÇÕES DE CLIENTES', 'CSAT e NPS de Scale, ICV, Traction e Journey · atualiza sozinho a cada resposta', 9);

  sh.getRange('B4').setValue('Período: de').setFontWeight('bold').setHorizontalAlignment('right');
  sh.getRange('D4').setValue('até').setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('F4:I4').merge().setValue('Deixe as datas em branco para ver tudo.').setFontColor(COR.cinza).setFontStyle('italic');
  [sh.getRange('C4'), sh.getRange('E4')].forEach(function (r) {
    r.setNumberFormat('dd/MM/yyyy').setBackground(COR.creme).setHorizontalAlignment('center')
      .setBorder(true, true, true, true, false, false, COR.creme2, SpreadsheetApp.BorderStyle.SOLID)
      .setDataValidation(SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false).build());
  });
  if (ini) sh.getRange('C4').setValue(ini);
  if (fim) sh.getRange('E4').setValue(fim);

  var INI = 'IF($C$4="",DATE(2000,1,1),$C$4)', FIM = 'IF($E$4="",DATE(2100,1,1),$E$4+1)';
  function crit(prodRef, pesqRef, extra) {
    return 'Respostas!$C:$C,' + prodRef + ',Respostas!$D:$D,' + pesqRef +
      ',Respostas!$B:$B,">="&' + INI + ',Respostas!$B:$B,"<"&' + FIM + ',Respostas!$M:$M,"<>Teste"' + (extra || '');
  }
  function formulas(prodRef, pesqRef) {
    var csat = ',Respostas!$E:$E,"CSAT"', nps = ',Respostas!$E:$E,"NPS"';
    return [
      '=COUNTIFS(' + crit(prodRef, pesqRef) + ')',
      '=IFERROR(COUNTIFS(' + crit(prodRef, pesqRef, csat + ',Respostas!$F:$F,">=4"') + ')/COUNTIFS(' + crit(prodRef, pesqRef, csat) + '),"")',
      '=IFERROR(AVERAGEIFS(Respostas!$F:$F,' + crit(prodRef, pesqRef, csat) + '),"")',
      '=IFERROR((COUNTIFS(' + crit(prodRef, pesqRef, nps + ',Respostas!$F:$F,">=9"') + ')-COUNTIFS(' +
        crit(prodRef, pesqRef, nps + ',Respostas!$F:$F,"<=6"') + '))/COUNTIFS(' + crit(prodRef, pesqRef, nps) + ')*100,"")'
    ];
  }

  // ---- Por produto ----
  secao_(sh, 6, 'POR PRODUTO', 9);
  cabecalho_(sh.getRange('B7:I7').setValues([['Produto', '', 'Respostas', 'CSAT %', 'Média CSAT', 'NPS', 'Follow-ups pendentes', '']]));
  sh.getRange('B7:C7').merge();
  var linha = 8;
  CATALOGO.forEach(function (c) {
    var f = formulas('$B' + linha, '"*"');
    sh.getRange(linha, 2).setValue(c.produto);
    sh.getRange(linha, 2, 1, 2).merge();
    sh.getRange(linha, 4, 1, 4).setFormulas([f]);
    sh.getRange(linha, 8).setFormula('=COUNTIFS(\'' + ABA_FOLLOW + '\'!$B:$B,$B' + linha + ',\'' + ABA_FOLLOW + '\'!$I:$I,"Pendente")');
    linha++;
  });
  var fimProd = linha - 1;
  linhasTabela_(sh, 8, fimProd, 2, 7);
  sh.getRange(8, 2, fimProd - 7, 1).setFontFamily('Bebas Neue').setFontSize(18).setFontColor(COR.laranja);
  formatarMetricas_(sh, 8, fimProd, 4);
  sh.getRange(8, 8, fimProd - 7, 1).setHorizontalAlignment('center').setFontWeight('bold');

  // ---- Por pilar / etapa ----
  var topo = fimProd + 3;
  secao_(sh, topo - 1, 'POR PILAR / ETAPA', 9);
  cabecalho_(sh.getRange(topo, 2, 1, 7).setValues([['Produto', 'Pesquisa', 'Respostas', 'CSAT %', 'Média CSAT', 'NPS', 'Tipo']]));
  linha = topo + 1;
  CATALOGO.forEach(function (c) {
    c.pesquisas.forEach(function (p) {
      sh.getRange(linha, 2, 1, 2).setValues([[c.produto, p[0]]]);
      sh.getRange(linha, 4, 1, 4).setFormulas([formulas('$B' + linha, '$C' + linha)]);
      sh.getRange(linha, 8).setValue(p[1]);
      linha++;
    });
  });
  linhasTabela_(sh, topo + 1, linha - 1, 2, 7);
  formatarMetricas_(sh, topo + 1, linha - 1, 4);
  sh.getRange(topo + 1, 8, linha - topo - 1, 1).setHorizontalAlignment('center').setFontColor(COR.cinza).setFontSize(9);

  var leg = linha + 1;
  sh.getRange(leg, 2, 1, 8).merge().setWrap(true).setFontColor(COR.cinza).setFontSize(9).setValue(
    'CSAT % = respostas 4 ou 5 ÷ total de respostas CSAT. NPS = % promotores (9-10) menos % detratores (0-6), de -100 a 100. ' +
    'Verde: CSAT ≥ 80% ou NPS ≥ 50. Vermelho: CSAT < 60% ou NPS < 0. Linhas marcadas como "Teste" na aba Respostas não entram na conta.');
  sh.setRowHeight(leg, 42);
  sh.setFrozenRows(4);
}

/* ======================= HISTÓRICO ======================= */

/** Importa as respostas reais da planilha antiga do Traction (ignora testes). Rode uma vez. */
function importarHistoricoTraction() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('HISTORICO_TRACTION') === 'ok') {
    throw new Error('O histórico do Traction já foi importado. Nada foi feito.');
  }
  var antiga = SpreadsheetApp.openById(PLANILHA_ANTIGA_TRACTION).getSheetByName('Respostas');
  var dados = antiga.getDataRange().getValues();
  var h = dados.shift();
  var col = function (nome) { return h.indexOf(nome); };
  var importadas = 0, ignoradas = 0;

  dados.forEach(function (l) {
    var nome = String(l[col('Nome')] || ''), semana = String(l[col('Semana')] || ''),
        dep = String(l[col('Depoimento')] || ''), empresa = String(l[col('Empresa')] || '');
    var teste = /teste/i.test(nome) || /teste/i.test(semana) || /testeManual/i.test(dep) || /teste/i.test(empresa);
    var nota = Number(l[col('Nota (1-5)')]);
    if (teste || !nota) { ignoradas++; return; }
    var m = semana.match(/Semana\s*(\d+)/i);
    registrar_({
      data: new Date(l[col('Data')]), produto: 'Traction',
      pesquisa: m ? 'Semana ' + m[1] + ' (formato antigo)' : semana, tipo: 'CSAT', nota: nota,
      comentario: l[col('Motivo (nota 1-3)')], destaques: l[col('Destaques (nota 4-5)')],
      depoimento: dep, nome: nome, empresa: empresa, origem: 'Histórico'
    }, false);
    importadas++;
  });
  props.setProperty('HISTORICO_TRACTION', 'ok');
  Logger.log('Importadas: ' + importadas + ' · Ignoradas (testes): ' + ignoradas);
}

/** Grava duas respostas de teste (marcadas como "Teste", não contam no Painel). */
function testeManual() {
  [['CSAT', 5, 'Traction', 'Etapa 1 · Pré-venda'], ['NPS', 9, 'Scale', 'Pilar 1 · Auditoria Comercial']].forEach(function (t) {
    registrar_({ data: new Date(), produto: t[2], pesquisa: t[3], tipo: t[0], nota: t[1],
      comentario: 'Teste do backend', nome: 'Teste', empresa: 'Empresa Teste', origem: 'Teste' }, false);
  });
  Logger.log('OK: veja as duas linhas "Teste" no fim da aba Respostas (pode apagá-las).');
}

/* ======================= AUXILIARES ======================= */

function planilha_() {
  var id = PropertiesService.getScriptProperties().getProperty('PLANILHA_ID');
  if (!id) throw new Error('Rode a função "configurar" antes de usar.');
  return SpreadsheetApp.openById(id);
}
function limpar_(sh) { sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns()).breakApart(); sh.clear(); }
function aba_(ss, nome) { return ss.getSheetByName(nome) || ss.insertSheet(nome); }
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function esc_(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function estiloBase_(sh, ncols) {
  sh.getRange(1, 1, sh.getMaxRows(), Math.max(ncols, sh.getMaxColumns()))
    .setFontFamily('Inter').setFontSize(10).setVerticalAlignment('middle');
  sh.setTabColor(COR.laranja);
}
function cabecalho_(r) {
  return r.setBackground(COR.carvao).setFontColor(COR.creme).setFontWeight('bold')
    .setFontSize(9).setHorizontalAlignment('center');
}
function titulo_(sh, texto, sub, ncols) {
  sh.getRange(1, 1, 2, ncols).setBackground(COR.laranja);
  sh.getRange(1, 2, 1, ncols - 1).merge().setValue(texto)
    .setFontFamily('Bebas Neue').setFontSize(30).setFontColor(COR.creme);
  sh.getRange(2, 2, 1, ncols - 1).merge().setValue(sub).setFontColor(COR.creme).setFontSize(10);
  sh.setRowHeight(1, 54); sh.setRowHeight(2, 26); sh.setRowHeight(3, 14);
}
function secao_(sh, linha, texto, ncols) {
  sh.getRange(linha, 2, 1, ncols - 1).merge().setValue(texto)
    .setFontFamily('Bebas Neue').setFontSize(16).setFontColor(COR.carvao)
    .setBorder(null, null, true, null, null, null, COR.laranja, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.setRowHeight(linha, 30);
}
function linhasTabela_(sh, de, ate, col, ncols) {
  if (ate < de) return;
  var r = sh.getRange(de, col, ate - de + 1, ncols);
  r.setBorder(null, null, true, null, null, true, COR.creme2, SpreadsheetApp.BorderStyle.SOLID);
  for (var i = de; i <= ate; i++) {
    sh.setRowHeight(i, 30);
    if ((i - de) % 2 === 1) sh.getRange(i, col, 1, ncols).setBackground('#FAF9F6');
  }
}
function formatarMetricas_(sh, de, ate, col) {
  var n = ate - de + 1;
  sh.getRange(de, col, n, 4).setHorizontalAlignment('center');
  sh.getRange(de, col, n, 1).setNumberFormat('0');
  var csat = sh.getRange(de, col + 1, n, 1).setNumberFormat('0%').setFontWeight('bold');
  sh.getRange(de, col + 2, n, 1).setNumberFormat('0.0');
  var nps = sh.getRange(de, col + 3, n, 1).setNumberFormat('0').setFontWeight('bold');
  var regras = sh.getConditionalFormatRules();
  regras.push(
    regraNum_(csat, '>=', 0.8, COR.verdeClaro, COR.verde), regraNum_(csat, '<', 0.6, COR.vermelhoClaro, COR.vermelho),
    regraNum_(nps, '>=', 50, COR.verdeClaro, COR.verde), regraNum_(nps, '<', 0, COR.vermelhoClaro, COR.vermelho)
  );
  sh.setConditionalFormatRules(regras);
}
function regraNum_(range, op, v, fundo, fonte) {
  var a = range.getA1Notation().split(':')[0];
  var f = '=AND(ISNUMBER(' + a + '),' + a + op + v + ')';
  return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f)
    .setBackground(fundo).setFontColor(fonte).setRanges([range]).build();
}
function regraTexto_(range, valores, fundo, fonte) {
  var a = range.getA1Notation().split(':')[0];
  var f = '=OR(' + valores.map(function (v) { return a + '="' + v + '"'; }).join(',') + ')';
  return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(f)
    .setBackground(fundo).setFontColor(fonte).setRanges([range]).build();
}
function larguras_(sh, ws) { ws.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); }); }
