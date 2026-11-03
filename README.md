# NEXO — Sua vida em sintonia

Organizador de todos os âmbitos da vida: trabalho, treinos, estudos, família, amizades, saúde, aniversários, refeições e lazer, com a mesma importância. React 19 + Next.js 16, Neon Auth, PostgreSQL Neon e Vercel.

## Funcionalidades

- Painel `/vida`: 12 categorias padrão, categorias personalizadas com cores e ícones, filtros, tarefas e compromissos por área da vida.
- Agenda: compromissos pontuais, semanais, aniversários anuais de dia inteiro e revisão semanal.
- Planejamento: sugere horários livres de 08h–21h, considera recorrências e exige confirmação para reservas/reagendamentos.
- Resumo diário, notificações locais e Web Push opt-in por categoria, inclusive com site fechado nos dispositivos compatíveis.
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
O projeto Vercel **existente** `nexo-rotina` já está conectado a `dudinha756/nexo-app` na branch `main`; commits disparam CI e deploy automático. **Não crie outro projeto**: preserve domínio e variáveis.
Em Vercel → Settings → Environment Variables, confirme que `DATABASE_URL`, `NEON_AUTH_BASE_URL` e `NEON_AUTH_COOKIE_SECRET` existem nas opções Production, Preview e Development.
Os valores reais nunca podem ser enviados ao GitHub. O banco Neon existente não deve ser recriado.

O CI executa `npm test` e `npm run build` em cada alteração na `main`.

## Assistente e resumo diário

O assistente (`/assistente`) interpreta frases em português, ditado por reconhecimento de voz do navegador e arquivos PDF com texto selecionável, `.xlsx`, `.csv`, `.tsv` e `.txt`. Tipos (tarefa/compromisso) e áreas da vida são campos separados; o usuário pode corrigir categoria, datas, horários e recorrências antes de confirmar. Importações parciais preservam itens não salvos para revisão. É um **interpretador determinístico**, não IA generativa.
O resumo (`/resumo`) mostra compromissos, tarefas e atrasos, permite ajustes e guarda o horário preferido no Neon. Notificações push em segundo plano exigem ativação individual por dispositivo e um agendador ativo; o site continua acessível como web app.
O arquivo `db/schema.sql` é idempotente e acrescenta as tabelas e campos das versões recentes. Não execute migrações em produção sem revisar previamente o estado do banco.

## Segurança e privacidade

O navegador não acessa o banco diretamente. Cada solicitação ao backend exige sessão ativa, e todas as leituras e mutações usam `user_id` nas consultas. Variáveis privadas permanecem na Vercel; **nunca** são incluídas no repositório.

## Limitações da V1

Sem sincronização com calendários externos ou inteligência artificial generativa. Web Push pode sofrer atrasos de entrega e, no iPhone, exige instalação na Tela de Início. Sugestões usam regras determinísticas; sessões reservadas são compromissos visíveis no calendário. Prazos e horários seguem a data/hora local fornecida pelo navegador do usuário.

## Importação de rotinas em PDF

Na página `/assistente`, o NEXO aceita `.pdf` (até 8 MB e 25 páginas), `.xlsx`, `.csv`, `.tsv` e `.txt`. O PDF é lido no **próprio navegador** com PDF.js; textos com posição de página são convertidos em linhas, tabelas com colunas `Dia | Atividade | Início | Fim` e grades com dias como colunas. O usuário sempre revisa os compromissos antes de confirmar.

**Limites:** a extração funciona para PDFs que possuem texto selecionável. Fotografias e PDFs digitalizados sem texto não são processados (OCR não implementado). Estruturas complexas ou horários ambíguos devem ser revisados manualmente. O arquivo PDF em si não é enviado ao servidor do NEXO.

## Web Push com o NEXO fechado

O usuário acessa `/vida`, seleciona categorias/antecedência e clica em **Ativar push neste aparelho**. No iPhone/iPad com iOS 16.4+, é necessário usar Safari → Compartilhar → Adicionar à Tela de Início e então abrir o NEXO pelo ícone antes de permitir notificações. O sistema usa Service Worker, VAPID e Neon, com agendamento a cada cinco minutos via GitHub Actions autenticado por OIDC. O agendador e o aparelho podem atrasar os avisos. Para verificar o recebimento, clique em **Enviar teste** após ativar. O registro pode ser desfeito por aparelho.

A migração aditiva de produção está em `db/migrations/20261103_push.sql`, e as instruções operacionais em `docs/2026-11-03-web-push.md`. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT` somente na Vercel, sem publicar segredos no GitHub.
