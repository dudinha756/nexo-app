# NEXO — verificação e correções de 30/10/2026

## Estado verificado antes das alterações
- Branch `main` em `2982bf4`: painel `/vida`, 12 categorias, categorias personalizadas, filtros, tarefas, recorrências, sugestões com confirmação, resumos e lembretes opt-in já existiam. Não foram reimplementados.
- CI do commit inicial: aprovado (GitHub Actions `40888032132`).
- Deploy Vercel de `2982bf4`: `READY` no projeto **existente** `nexo-rotina`.
- Neon **existente** `nexo-app`, branch `production`: esquema de categorias presente. Inspeção somente leitura.

## Correções pequenas e reversíveis
1. `5674250` — conflitos de eventos semanais/anuais iniciados há anos passam a ser verificados nos próximos 400 dias, não apenas nos 400 dias seguintes à data original.
2. `f824e6c` — testes de regressão para séries semanais e anuais antigas e eventos de dia inteiro.
3. `f14e01a` — lembretes no navegador revalidam a sessão antes de cada ciclo visível e limpam eventos em troca de conta, logout ou falha de leitura. Não é push em segundo plano.
4. `0a1c7e0` — preferências de lembretes são reinicializadas ao mudar de usuário; filtros e dias selecionados recebem `aria-pressed` e descrição acessível.

## Validação
- CI do commit `0a1c7e0`: **success** em https://github.com/dudinha756/nexo-app/actions/runs/41050040610 (testes e `next build`).
- Vercel: deploy do mesmo SHA marcado **READY** em produção no projeto existente.
- Consulta agregada e somente leitura no Neon: 1 evento, 1 registro legado sem `category_key`, 0 categorias personalizadas órfãs em tarefas/eventos, 0 vínculos tarefa-evento entre usuários distintos, 0 eventos com recorrências semanal e anual simultâneas. Nenhum registro foi modificado.
- Vercel runtime errors: nenhum agrupamento encontrado na janela consultada de 24 horas.

## Limites e próximos testes
- O CI executa testes unitários e build, **não** navegação autenticada real. Login, troca de contas com duas sessões, avisos no navegador e fluxos de criação/edição devem ser exercitados com contas de teste, sem alterar dados de usuários reais.
- Revisar validação de horários no servidor e comportamento de séries recorrentes antigas em contas de teste.
- Os lembretes dependem de permissão e navegador aberto; não há garantia de push com navegador fechado, OCR de PDFs digitalizados ou IA generativa.
- Nenhum projeto Neon/Vercel foi recriado, e nenhuma migração ou alteração de dados de usuários foi realizada.
