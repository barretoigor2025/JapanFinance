# JapanFinance

Aplicativo financeiro para brasileiros no Japão, pensado primeiro para quem recebe por hora e precisa controlar salário, horas trabalhadas, yūkyū, adicional noturno, contas, cartão, carros, shaken e impostos.

## O que já nasce pronto

- Importação do backup JSON do app antigo.
- Exportação de backup JSON como fonte da verdade.
- Cálculo inicial de horas trabalhadas, horas extras, adicional noturno, yūkyū e bruto estimado.
- Painel mensal com gastos fixos, cartão, saldo previsto e histórico visual.
- Área de carros e impostos usando os veículos importados do backup.
- Base para Firebase, sem obrigar nuvem. O app roda offline usando localStorage.

## Rodando o projeto

```bash
npm install
npm run dev
```

## Backup e privacidade

O repositório não inclui dados pessoais reais. O app foi construído para aceitar o arquivo `.json` exportado pelo usuário pelo botão **Importar backup**. Depois disso, os dados ficam no navegador e podem ser exportados novamente a qualquer momento.

## Firebase opcional

Crie um arquivo `.env.local` com:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

A implementação completa de Firestore/Auth entra na próxima etapa. A prioridade deste primeiro commit é garantir um app bonito, funcional e com import/export confiável.

## Próximas etapas fortes

1. CRUD completo de dias trabalhados, despesas, cartão e veículos.
2. Auditoria salário real vs salário estimado.
3. Cálculo mais refinado de Shakai Hoken, Kousei Nenkin, seguro desemprego, imposto de renda e imposto municipal.
4. Firebase Auth + Firestore com snapshots versionados de backup.
5. PWA instalável no celular.

## Publicacao

Este projeto ja vem com `.github/workflows/deploy.yml` para publicar no GitHub Pages usando GitHub Actions. Veja `PUBLISH.md`.

## Firebase

Firebase e opcional. Primeiro o app roda local-first. Para ativar nuvem, crie `.env.local` baseado em `.env.example`.
