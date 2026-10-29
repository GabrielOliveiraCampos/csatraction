# Sellfy CSAT — Painel unificado (Scale, ICV, Traction e Journey)

Um único site na Vercel com:

- **Painel do administrador** (`/admin`, protegido por usuário e senha): escolhe o produto, vê as pesquisas e copia o link ou uma mensagem pronta para mandar ao cliente.
- **Página do cliente** (`/avaliacao/<produto>/<pesquisa>`): só o formulário daquela pesquisa. Não tem menu, nem botão de voltar, nem link para o painel.

| Produto | Pesquisas | Escala |
|---|---|---|
| Scale — Implementação Cultura de Vendas (antigo ICV) | Pilares 1 a 6 | NPS 0-10 |
| Scale | Entrega Completa | CSAT 1-5 |
| ICV — Implementação Cultura de Vendas · Anual | Pilares 1 a 6 + Entrega Completa (igual ao Scale) | NPS 0-10 / CSAT 1-5 |
| Traction | Etapa 1 · Pré-venda, Etapa 2 · Geração de Demanda, Etapa 3 · Venda | CSAT 1-5 |
| Journey | Etapa 1 · Produção de Conteúdo, Etapa 2 · Pré-vendas, Etapa 3 · Vendas | CSAT 1-5 |

## Estrutura

```
admin/            painel (index = escolha do produto, produto.html = lista de links)
avaliacao.html    formulário do cliente (um só arquivo para todas as pesquisas)
assets/
  pesquisas.js    ← lista de produtos e pesquisas, endpoint e token de cada produto
  brand.css       cores e fontes Sellfy (Bebas Neue, Inter, Shadows Into Light)
  form.css/js     visual e lógica do formulário
middleware.js     senha do painel (Vercel)
vercel.json       rotas
backend/Code.gs   backend do Google Apps Script (CSAT + NPS)
```

**Para adicionar, renomear ou remover uma pesquisa, edite só `assets/pesquisas.js`.** O painel e o formulário se atualizam sozinhos.

## Deploy na Vercel

1. Suba este repositório no GitHub e importe na Vercel (Framework: **Other**, sem build).
2. Em **Settings → Environment Variables**, crie:
   - `ADMIN_USER` — ex.: `sellfy`
   - `ADMIN_PASSWORD` — uma senha forte
3. Faça um novo deploy. Abrir o domínio leva ao `/admin`, que pede usuário e senha. Sem as variáveis, o painel fica bloqueado.

## Respostas (Google Sheets)

Todas as respostas, de todos os produtos, vão para **uma única planilha**:
[Sellfy — Avaliações de Clientes](https://docs.google.com/spreadsheets/d/1aHyayGLnCr9AGECrDCadHXz8XFtce5ZU0W9c25bCztM/edit).
O backend é o `backend/Code.gs` (Google Apps Script), com um endpoint e um token só.

| Aba | Para quê |
|---|---|
| **Painel** | CSAT %, média e NPS por produto e por pilar/etapa, com filtro de período. Atualiza sozinho. |
| **Follow-up** | Toda nota baixa (CSAT 1-3 ou NPS 0-6) entra aqui como "Pendente". A operação preenche Status, Responsável e Observações. |
| **Depoimentos** | Respostas com depoimento, da mais recente para a mais antiga. |
| **Respostas** | Base bruta: uma linha por resposta. Não edite as colunas; marque testes com "Teste" na coluna Origem. |

Nota baixa também dispara um e-mail para `ALERTA_EMAILS` (no topo do `Code.gs`).

### Instalação (uma vez só)

1. Abra a planilha → **Extensões → Apps Script**. Apague o conteúdo do `Code.gs`, cole o `backend/Code.gs` e salve.
2. Escolha a função **`configurar`** e clique em **Executar** (autorize o acesso). Ela cria as abas, as cores e as fórmulas.
3. Escolha **`importarHistoricoTraction`** e execute. Ela traz as respostas reais da planilha antiga do Traction (sem os testes), marcadas como "Semana N (formato antigo)".
4. **Implantar → Nova implantação → App da Web**. Executar como: **Eu**. Quem pode acessar: **Qualquer pessoa**. Copie a URL `/exec`.
5. Cole a URL em `assets/pesquisas.js` (`BACKEND.endpoint`) e faça o deploy. Enquanto ela estiver vazia, o painel mostra o aviso "Planilha não conectada" e nada é gravado.

Para mudar o código depois: **Implantar → Gerenciar implantações → Editar → Nova versão**. Assim a URL continua a mesma.

Ao criar ou renomear uma pesquisa em `assets/pesquisas.js`, adicione também no `CATALOGO` do `Code.gs` e rode `configurar` de novo. Isso só redesenha o Painel e nunca apaga respostas.

As planilhas antigas ("CSAT Traction" e "CSAT Pilares") ficam só como arquivo.

## Teste local

Abra o painel com `?produto=scale` em `admin/produto.html`, ou o formulário com `avaliacao.html?p=scale/pilar-1-auditoria-comercial&preview=1`, em qualquer servidor estático. O `preview=1` mostra um aviso e **não envia** nada para a planilha. O botão "Prévia" do painel já usa esse modo.
