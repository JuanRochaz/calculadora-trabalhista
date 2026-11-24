# Calculadoras trabalhistas — JR Dev

Calculadoras gratuitas de **rescisão**, **férias**, **13º salário** e **horas extras**, com o cálculo
linha a linha. Tudo roda no navegador: não há backend e nenhum dado é enviado.

> Cálculo estimativo. Não considera convenção coletiva específica e não substitui o contador.

## Como rodar

```bash
npm install
npm run dev      # site em http://localhost:5173
npm test         # testes das regras de cálculo
npm run lint
npm run build
```

## Organização

- `src/calc/` — regras de cálculo puras (sem React), cada uma com testes. Valores em centavos.
- `src/config/tabelas-AAAA.ts` — INSS, IRRF, dedução por dependente e salário mínimo.
- `src/pages/` e `src/components/` — telas.

## Como atualizar as tabelas

1. Copie `src/config/tabelas-2026.ts` para `tabelas-AAAA.ts` e preencha com os valores oficiais
   (gov.br / Receita Federal), anotando a fonte e a data no comentário.
2. Troque o export em `src/config/tabelas.ts`.

As funções de cálculo não mudam. Os testes usam tabelas fictícias.

## Status

Em desenvolvimento. As tabelas de 2026 ainda não foram preenchidas.

---

Feito pela [JR Dev](https://jrdevtecnologia.com.br) · da planilha ao código.
