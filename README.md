# CSAT Semanal — Traction (Sellfy Group)

6 formulários de CSAT, um por semana do programa **Traction**, escrevendo na
**mesma planilha/Web App compartilhado** que já atende os outros pilares.
`Traction` entra como um novo valor na coluna `Pilar` (`"Sellfy Traction"`),
e a coluna `Semana` (nova) diferencia a etapa dentro do Traction — os outros
pilares simplesmente deixam essa coluna em branco.

## Estrutura do projeto

```
sellfy-traction-csat/
├── index.html                          → landing listando as 6 semanas
├── semana-1/index.html  … semana-6/index.html
├── backend-google-apps-script/
│   └── Code.gs.txt                     → referência; cola manual no Apps Script
├── vercel.json                         → {"trailingSlash": true}
└── README.md
```

## Passo a passo — do zero ao teste end-to-end

### 1. Planilha (se ainda não existir a compartilhada de CSAT)
Se você já tem a planilha única de CSAT dos outros pilares, **pule para o
passo 2** — não crie uma planilha nova, é ela que vai receber os dados do
Traction também.

Se for a primeira vez: crie uma planilha no Google Sheets e copie o **ID**
da URL (`https://docs.google.com/spreadsheets/d/ESSE_TRECHO_AQUI/edit`).

### 2. Apps Script
1. Na planilha → **Extensões → Apps Script**.
2. Apague o conteúdo padrão e cole o conteúdo de `Code.gs.txt`.
3. Preencha no topo do script:
   - `SHEET_ID`: o ID da planilha (passo 1).
   - `TOKEN_ESPERADO`: um token secreto qualquer (pode gerar rodando
     `Logger.log(Utilities.getUuid())` numa função temporária e copiando
     o resultado do painel de Execuções).
4. Rode a função `testeManual` uma vez (▶️ no editor, selecionando essa
   função) — autorize as permissões pedidas. Confira no painel de
   **Execuções** (ícone de relógio) que apareceu como **Concluído** e que
   a linha de teste foi gravada na aba `Respostas`.
5. **Implantar → Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa** (não "qualquer pessoa no domínio")
6. Copie a **URL do Web App** gerada.

> Sempre que editar o código depois disso, é preciso ir em
> **Implantar → Gerenciar implantações → editar (lápis) → Nova versão**.
> Só salvar o script não atualiza a URL já publicada.

### 3. Preencher os 6 HTMLs
Em cada um dos 6 arquivos (`semana-1/index.html` … `semana-6/index.html`),
no bloco `CONFIG` dentro do `<script>`, substitua:

```javascript
const CONFIG = {
  endpoint: "COLE_AQUI_A_URL_DO_WEB_APP",   // URL do passo 2.6
  token: "COLE_AQUI_O_TOKEN",               // TOKEN_ESPERADO do passo 2.3
  pilar: "Sellfy Traction",
  semana: "Semana 1 – Traction"             // já vem preenchido, não mexer
};
```

`endpoint` e `token` são **os mesmos nos 6 arquivos** — só `semana` já vem
diferente em cada um.

### 4. GitHub
1. Crie um repositório novo (ex: `sellfy-traction-csat`) no GitHub Desktop.
2. **Antes do primeiro commit**, confirme que a pasta que tem os arquivos
   reais (`index.html`, `semana-1/`, etc.) é a mesma que tem o `.git` —
   se o GitHub Desktop criar o `.git` numa subpasta vazia, os arquivos
   reais ficam "de fora" do repositório (o commit só mostra
   `.gitattributes`). Se isso acontecer, apague o repo e adicione de novo
   apontando direto para a pasta que contém os arquivos.
3. Publique o repositório (pode ser privado).

### 5. Vercel
1. **New Project** no Vercel → importe o repositório do GitHub.
2. Não precisa de build command — é site estático puro (deixe em branco
   ou "Other").
3. Deploy. O `vercel.json` já garante URLs limpas (`/semana-1/` funciona
   sem precisar configurar `cleanUrls` manualmente).

### 6. Teste end-to-end
1. Abra `https://SEU-DOMINIO.vercel.app/semana-1/` no celular.
2. Preencha uma resposta de teste completa (nota, follow-up, nome, empresa).
3. Confirme na planilha (aba `Respostas`) que uma linha nova apareceu com
   `Pilar = Sellfy Traction` e `Semana = Semana 1 – Traction`.
4. Repita rapidamente para as outras 5 semanas trocando só a URL.

> Se o teste via `curl` retornar algo como "Não foi possível abrir o
> arquivo" ou "Página não encontrada", **isso não significa falha real** —
> é só a exibição do redirecionamento do Google no terminal. Confirme
> sempre no painel de Execuções do Apps Script. Use `curl -L` para seguir
> o redirecionamento se for testar assim.

## Aba `Resumo CSAT` (dashboard agregado — criada via Apps Script)

A estrutura (cabeçalhos + fórmulas) é criada automaticamente pela função
`criarAbaResumoCSAT()`, já incluída no `Code.gs`. Rode-a **uma única vez**:

1. No editor do Apps Script, selecione `criarAbaResumoCSAT` no dropdown ▶️.
2. Rode e confirme "Concluído" no painel de Execuções.
3. A aba `Resumo CSAT` aparece na planilha, já com duas seções:
   - **Por Pilar**: total de respostas, positivas (nota 4-5), CSAT (%) e
     nota média — uma linha por pilar, descoberta automaticamente via
     `ÚNICO`+`FILTRO` (não depende de eu saber o nome exato que cada
     pilar já usa).
   - **Traction por Semana**: mesma métrica, filtrada por
     `Pilar = "Sellfy Traction"` e quebrada pela coluna `Semana`.

A função é **idempotente** — rodar de novo não duplica nada, ela só avisa
no Logger que a aba já existe. Se quiser reconstruir do zero, apague a aba
manualmente antes de rodar de novo.

**Importante:** depois de criada, quem mantém os números atualizados são
as **fórmulas nativas da planilha** (`CONTSE`, `CONTSES`, `MÉDIASES`,
`SEERRO`), recalculando sozinhas a cada resposta nova — o script não
precisa rodar de novo pra isso, e nenhuma execução extra de Apps Script é
consumida por resposta. Evitei `QUERY` complexo de propósito: ele remapeia
letras de coluna a partir do início do intervalo escolhido, não da posição
real, o que já causou `#ERROR!` recorrente em outros relatórios.

## Cálculo do CSAT por semana

Considerando positivas as notas 4 e 5, com `Pilar` na coluna B, `Semana` na
coluna C e `Nota (1-5)` na coluna D:

```
=CONTSES(D:D;">=4";B:B;"Sellfy Traction";C:C;"Semana 1 – Traction")
  / CONTSES(B:B;"Sellfy Traction";C:C;"Semana 1 – Traction") * 100
```

Troque "Semana 1" pelas demais para montar a curva das 6 semanas. Evite
`QUERY` complexo para esse tipo de agregação — ele remapeia letras de
coluna a partir do início do intervalo escolhido, não da posição real na
planilha, o que já gerou `#ERROR!` recorrente em outros relatórios.

## O que foi ajustado em relação ao rascunho original

O guia inicial (`TRACTION-CSAT-SEMANAL-COMO-USAR.md`) trazia um `Code.gs`
de exemplo com `getActiveSpreadsheet()`, escrita por posição fixa de array,
sem `LockService` e sem token, apontando para uma planilha isolada. Esse
padrão já havia causado problemas nos outros pilares (falha em produção,
dados desalinhados, corrida em picos de envio) e foi substituído aqui pelo
padrão validado: `openById`, escrita por nome de cabeçalho, lock e token,
gravando na planilha compartilhada.
