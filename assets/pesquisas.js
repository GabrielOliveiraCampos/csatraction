/* =====================================================================
   PESQUISAS — fonte única de verdade do painel e dos formulários.
   Para adicionar/renomear uma pesquisa, edite só este arquivo.

   Link do cliente: /avaliacao/<produto>/<slug>
   tipo "csat" = escala 1-5 com emojis · tipo "nps" = escala 0-10
   formato "pilares" ou "etapas" muda só o texto da mensagem pronta
   tema = cor do card no painel: laranja | escuro | creme | contorno

   Ao criar/renomear uma pesquisa, atualize também o CATALOGO em
   backend/Code.gs para ela aparecer no Painel da planilha.
   ===================================================================== */

// Backend único: Apps Script da planilha "Sellfy — Avaliações de Clientes"
// (backend/Code.gs). Cole aqui a URL /exec da implantação. Enquanto estiver
// vazio, o painel mostra um aviso e as respostas NÃO são gravadas.
var BACKEND = {
  endpoint: "https://script.google.com/macros/s/AKfycbzpgb5ReXpPXmtEEKC3wRa8x2jqgJ8WYmxJrRzz5pX0NVMFWQ8XiJZ2o0Soa9wudGkS/exec",
  token: "3855f313-111b-474f-afcf-f78503873d19" // o mesmo TOKEN_ESPERADO do Code.gs
};

// Os 6 pilares + entrega completa, iguais no Scale e no ICV
function pilaresCultura(sigla) {
  return [
    { slug: "pilar-1-auditoria-comercial", ordem: "Pilar 1", titulo: "Auditoria Comercial", tipo: "nps" },
    { slug: "pilar-2-calendario-da-cultura", ordem: "Pilar 2", titulo: "Calendário da Cultura", tipo: "nps" },
    { slug: "pilar-3-engenharia-de-oportunidades", ordem: "Pilar 3", titulo: "Engenharia de Oportunidades", tipo: "nps" },
    { slug: "pilar-4-arquitetura-do-sim", ordem: "Pilar 4", titulo: "Arquitetura do Sim", tipo: "nps" },
    { slug: "pilar-5-governanca-comercial", ordem: "Pilar 5", titulo: "Governança Comercial", tipo: "nps" },
    // TODO: confirmar o nome do 6º pilar (título e slug)
    { slug: "pilar-6", ordem: "Pilar 6", titulo: "Pilar 6", tipo: "nps", pendente: true },
    {
      slug: "entrega-completa", ordem: "Entrega final", titulo: "Entrega Completa", tipo: "csat",
      pergunta: "Quão satisfeito(a) você está com a <strong>entrega completa do " + sigla + "</strong>, o resultado dos 6 pilares no seu processo comercial?",
      final: true
    }
  ];
}

window.SELLFY = {
  produtos: {
    scale: {
      id: "scale",
      sigla: "Scale",
      nome: "Implementação Cultura de Vendas",
      descricao: "Seis pilares avaliados com NPS e uma avaliação final da entrega completa.",
      formato: "pilares",
      tema: "laranja",
      pesquisas: pilaresCultura("Scale")
    },
    icv: {
      id: "icv",
      sigla: "ICV",
      nome: "Implementação Cultura de Vendas · Anual",
      descricao: "Versão anual, com os mesmos seis pilares em NPS e a avaliação final da entrega completa.",
      formato: "pilares",
      tema: "escuro",
      pesquisas: pilaresCultura("ICV")
    },
    traction: {
      id: "traction",
      sigla: "Traction",
      nome: "Sellfy Traction",
      descricao: "Três etapas avaliadas com CSAT ao final de cada fase do programa.",
      formato: "etapas",
      tema: "creme",
      pesquisas: [
        {
          slug: "etapa-1-pre-venda", ordem: "Etapa 1", titulo: "Pré-venda", tipo: "csat",
          detalhe: "3 reuniões, uma por semana",
          pergunta: "Quão satisfeito(a) você está com a <strong>Etapa 1: Pré-venda</strong> do Traction (as 3 reuniões, uma por semana)?"
        },
        {
          slug: "etapa-2-geracao-de-demanda", ordem: "Etapa 2", titulo: "Geração de Demanda", tipo: "csat",
          detalhe: "2 reuniões",
          pergunta: "Quão satisfeito(a) você está com a <strong>Etapa 2: Geração de Demanda</strong> do Traction (as 2 reuniões desta etapa)?"
        },
        {
          slug: "etapa-3-venda", ordem: "Etapa 3", titulo: "Venda", tipo: "csat",
          detalhe: "3 reuniões das semanas finais",
          pergunta: "Quão satisfeito(a) você está com a <strong>Etapa 3: Venda</strong> do Traction (as 3 reuniões das semanas finais)?"
        }
      ]
    },
    journey: {
      id: "journey",
      sigla: "Journey",
      nome: "Sellfy Journey",
      descricao: "Três etapas avaliadas com CSAT: produção de conteúdo, pré-vendas e vendas.",
      formato: "etapas",
      tema: "contorno",
      pesquisas: [
        {
          slug: "etapa-1-producao-de-conteudo", ordem: "Etapa 1", titulo: "Produção de Conteúdo", tipo: "csat",
          pergunta: "Quão satisfeito(a) você está com a <strong>Etapa 1: Produção de Conteúdo</strong> do Journey?"
        },
        {
          slug: "etapa-2-pre-vendas", ordem: "Etapa 2", titulo: "Pré-vendas", tipo: "csat",
          pergunta: "Quão satisfeito(a) você está com a <strong>Etapa 2: Pré-vendas</strong> do Journey?"
        },
        {
          slug: "etapa-3-vendas", ordem: "Etapa 3", titulo: "Vendas", tipo: "csat",
          pergunta: "Quão satisfeito(a) você está com a <strong>Etapa 3: Vendas</strong> do Journey?"
        }
      ]
    }
  },
  endpoint: BACKEND.endpoint,
  token: BACKEND.token
};

window.SELLFY.buscar = function (produtoId, slug) {
  var produto = window.SELLFY.produtos[produtoId];
  if (!produto) return null;
  for (var i = 0; i < produto.pesquisas.length; i++) {
    if (produto.pesquisas[i].slug === slug) return { produto: produto, pesquisa: produto.pesquisas[i] };
  }
  return null;
};
