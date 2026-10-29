# NEXO — categorias para todos os âmbitos da vida (29/10/2026)

## Objetivo

O NEXO não é um gerenciador acadêmico: compromissos de trabalho, atividades físicas, estudos, vida pessoal, aniversários, refeições, amigos, família, saúde e lazer devem compartilhar a mesma agenda e o mesmo mecanismo de detecção de conflitos. A importância depende das prioridades definidas pelo usuário, não da categoria.

## Implementação preparada

- `lib/categories.ts`: 12 categorias padrão com cores e ícones; preserva os identificadores antigos `work`, `class`, `training`, `personal` e `study`.
- `db/migrations/20261029_categories.sql`: migração idempotente e não destrutiva para categorias personalizadas, campos opcionais em tarefas e compromissos e nova coluna opcional `category_key` para as novas categorias, sem remover a restrição legada. **Não há atualização ou remoção de registros existentes.**
- `app/api/data/route.ts`: lista, cria e edita categorias personalizadas do usuário; aceita categorias padrão e personalizadas em tarefas e compromissos; associa sessões planejadas à categoria da tarefa (em vez de classificar tudo como estudo); permite inspecionar conflitos sem alterar a agenda.
- `app/api/suggest/route.ts`: considera recorrência anual e eventos de dia inteiro na consulta de disponibilidade.
- `lib/schedule.ts`: mantém os eventos de dia inteiro fora de bloqueios de horário e identifica conflitos recorrentes.
- `tests/schedule.test.mjs`: testes de compatibilidade, planejamento multicategoria e colisões de recorrência.

## Ordem segura de publicação

1. Revisar a migração e aplicá-la ao banco Neon **existente**, com backup ou ponto de recuperação disponível. Não criar outro projeto e não recriar tabelas.
2. Publicar o código no repositório `dudinha756/nexo-app` e acompanhar o CI e o deployment do projeto Vercel `nexo-rotina` existente.
3. Validar com conta de teste que eventos antigos ainda aparecem, que cada usuário enxerga somente suas próprias categorias e que criar/editar categorias não afeta compromissos existentes.
4. Na etapa de interface, expor categorias e filtros, mostrar a opção de categoria personalizada e exigir confirmação antes de qualquer reagendamento ou gravação de um compromisso com conflito.

**Limitações desta etapa:** a interface atual ainda mostra somente as cinco categorias antigas. A migração e as novas rotas precisam ser publicadas e validadas antes que o usuário possa acessar as novas categorias na interface. O teste automatizado de regras não substitui a compilação completa do Next.js nem os testes integrados com Neon e Vercel.
