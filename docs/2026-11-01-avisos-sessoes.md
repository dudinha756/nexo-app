# NEXO — qualidade, sessões e avisos (01/11/2026)

## Estado conferido antes das mudanças
- Repositório existente `dudinha756/nexo-app`, branch `main`: `1f8bf2b33576c54bf7b37c9777f622b47b0ebda3`; CI de 31/10 aprovado.
- Projeto Vercel existente `nexo-rotina`: produção `READY` no mesmo commit, sem recriação.
- Neon existente `nexo-app`, branch `production`: somente consultas `SELECT`, sem migrações ou escritas.
- Recursos já presentes e preservados: `/vida`, 12 categorias, categorias personalizadas, filtros, recorrências, confirmação de reagendamento, revisão semanal, resumo diário, importação e ditado, avisos opt-in no navegador aberto.

## Correções incrementais realizadas
1. `91712a3` — a API autenticada da agenda retorna o ID da conta correspondente à resposta.
2. `0736f22` — a página `/vida` revalida a sessão ao receber foco/voltar a ficar visível, oculta a agenda durante a validação, descarta respostas antigas e limpa dados/formulários/sugestões ao mudar a conta. Falhas não mantêm compromissos antigos visíveis.
3. `e90ec0d`, `44b4e02`, `c9ae50d` — limite opt-in de 1, 3, 5 ou 10 avisos por dia por conta e navegador, preservando preferências antigas (padrão: 5). A gravação de preferências confere a sessão novamente, inclusive após a permissão do navegador.
4. `22dddb5` — testes de preferências antigas, limites e entradas inválidas.
5. `adceefc`, `db1bb5b`, `e5489e6` — sugestões de planejamento não aceitam relógio de cliente anterior ao relógio de reserva do servidor; regressão automatizada adicionada.

## Validação
- GitHub Actions: `e5489e67a45df119a4ec9738a2b1c52376ee4eaa`, run `41300756144`, **success** (testes e build): https://github.com/dudinha756/nexo-app/actions/runs/41300756144
- Vercel: deploy de produção `dpl_8fJthwSQNr5nDhP1APbrGX3Yh1BG`, commit `e5489e6`, estado **READY**, alias `nexo-rotina.vercel.app`.
- Smoke test `GET /vida` via Vercel: HTTP 200, HTML retornado.
- Erros agrupados de runtime: nenhum na janela de 1 hora consultada.
- Neon (agregados em 01/11): 3 compromissos, 2 tarefas, 0 categorias personalizadas, 1 evento legado com `category_key` nulo; 0 referências cruzadas entre usuários para tarefas, disciplinas e categorias; 0 eventos simultaneamente semanais e anuais.
- Nenhum registro, credencial, sessão, projeto, branch ou infraestrutura foi alterado no Neon/Vercel.

## Limitações e próximos testes
- **Não houve E2E autenticado com duas contas reais**, nem teste real de permissão/notificação em navegador. O banco atualmente contém dados de apenas uma conta; não extrapolar a ausência de referências cruzadas para garantia de isolamento E2E.
- O endpoint `/api/data` não pôde ser inspecionado externamente sem autenticação por limitação da ferramenta de acesso ao deployment; a rota foi revisada por código e compilação, não por sessão real.
- Limite diário de avisos é local ao navegador, de melhor esforço entre abas, sem push em segundo plano; avisos só aparecem com o NEXO aberto e visível.
- Ainda pendentes: fuso horário por usuário; testes reais de recorrência e categorias personalizadas (não há categorias personalizadas no banco de produção); testes de corrida entre dois agendamentos simultâneos; auditoria de acessibilidade com navegador/leitor de tela.
- Sem PWA, push com navegador fechado, OCR de PDFs digitalizados ou interpretação generativa comprovada.
- Reorganizações e reservas continuam dependendo de confirmação explícita do usuário.
