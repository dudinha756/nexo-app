# NEXO — Sua vida em sintonia

Aplicativo independente de planejamento de rotina e estudos. React 19 + Next.js 16, Neon Auth, PostgreSQL Neon e Vercel.

## Funcionalidades

- Agenda semanal: compromissos únicos e recorrentes, categorias e navegação entre semanas.
- Faculdade: disciplinas, tarefas, prazos, duração, prioridades e marcação de conclusão.
- Planejar: sugere sessões em horários livres de 08h–21h, verifica compromissos recorrentes, reserva uma sessão por vez sem conflito.
- Acesso por conta própria, com dados isolados pelo ID do usuário.

## Instalação

1. `npm install`
2. Preencha as variáveis de `.env.example` em `.env.local`.
3. Habilite Neon Auth Managed Better Auth para sua branch Neon.
4. Execute `db/schema.sql` uma única vez no banco exclusivo NEXO.
5. `npm run dev`.
6. `npm test` executa os testes automatizados de recorrência e sugestões.

### GitHub e Vercel

Este repositório é exclusivo do **NEXO**. O aplicativo online existente está em
`https://nexo-rotina.vercel.app` (projeto Vercel `nexo-rotina`).
Para automatizar publicações, conecte **este repositório** em **Vercel → nexo-rotina → Settings → Git → Connect Git Repository**.
Selecione `dudinha756/nexo-app`, branch `main`, raiz `/`, framework Next.js.
**Não crie outro projeto Vercel**: aproveite o existente para preservar o domínio e as variáveis.
Em Vercel → Settings → Environment Variables, confirme que `DATABASE_URL`, `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET` existem nas opções Production, Preview e Development.
Os valores reais nunca podem ser enviados ao GitHub. O banco Neon existente não deve ser recriado.

O CI executa `npm test` e `npm run build` em cada alteração na `main`.

## Assistente e resumo diário

O assistente (`/assistente`) interpreta frases em português e planilhas `.xlsx`/`.csv`; o usuário revisa e confirma os horários. É um **interpretador determinístico**, não IA generativa.
O resumo (`/resumo`) mostra compromissos, tarefas e atrasos, permite ajustes e guarda o horário preferido no Neon. Alertas funcionam com o NEXO aberto, não com navegador fechado.
O arquivo `db/schema.sql` é idempotente e acrescenta as tabelas e campos das versões recentes.

## Segurança e privacidade

O navegador não acessa o banco diretamente. Cada solicitação ao backend exige sessão ativa, e todas as leituras e mutações usam `user_id` nas consultas. Variáveis privadas permanecem na Vercel; **nunca** são incluídas no repositório.

## Limitações da V1

Sem sincronização com calendários externos, notificações push fechadas ou inteligência artificial generativa. Sugestões usam regras determinísticas; sessões reservadas são compromissos visíveis no calendário. Prazos e horários seguem a data/hora local fornecida pelo navegador do usuário.

## Publicação automática

Após vincular `dudinha756/nexo-app` ao projeto Vercel existente `nexo-rotina`, commits na branch de produção `main` podem disparar builds automáticos. Este ajuste de documentação também serve para verificar a integração GitHub → Vercel sem alterar o funcionamento do aplicativo.
