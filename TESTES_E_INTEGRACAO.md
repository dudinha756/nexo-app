# NEXO — relatório de validação técnica (28/10/2026)

## Verificado na versão pública Vercel

- `GET /`: HTTP 200.
- `GET /reset-password`: HTTP 200.
- `GET /api/auth/get-session`: HTTP 200 com resposta `null` quando ninguém está autenticado.
- `GET /api/data`: HTTP 401 quando ninguém está autenticado, confirmando bloqueio do acesso anônimo.
- `POST /api/data` com corpo vazio e sem sessão: HTTP 401 (mutação anônima bloqueada).
- Publicação da Vercel `dpl_HGe4WEhtXtNwdNip9hSeATYTdFcu`: estado READY.

## Verificado no banco Neon de teste isolado

- Branch: `nexo-e2e-tests-20261028` (isolada de produção).
- Foram criadas **duas identidades de teste** na autenticação Neon desta branch.
- Inclusão de disciplina, tarefa, compromisso recorrente e sessão de estudo vinculada à tarefa.
- Leitura posterior e independente comprovou a persistência: uma identidade retornou seus registros; a outra, nenhum registro.
- O vínculo `task_id` da sessão agendada foi preservado.

## Verificado nos testes automatizados locais

- 8 testes aprovados em `npm test`.
- Casos: datas inválidas, virada de mês, recorrência semanal, conflitos de horário, limites de horário 08h–21h, duração total, tempo já agendado, prazo vencido e ausência de horários no dia ocupado.

## Pendências reais (não marcar como validadas)

- Cadastro **pelo formulário público** e login **com senha** não tiveram teste ponta a ponta com sessão autenticada. As duas identidades de QA foram criadas pela administração do Neon apenas na branch de teste.
- Não foi realizado teste ponta a ponta **navegador → API privada → Neon de produção → recarregar página**.
- Recuperação de senha por e-mail não foi exercitada; apenas a rota pública foi verificada.
- A versão publicada na Vercel é a implantação em produção citada acima; o código-fonte deste pacote possui melhorias e testes adicionais que deverão ser sincronizados à Vercel na conexão do repositório GitHub.
- Integração automática GitHub↔Vercel ainda não pode ser marcada como concluída até ser criado um repositório GitHub próprio do NEXO e vinculado ao projeto Vercel existente.

## Preparação para o GitHub

1. Criar um repositório privado vazio chamado `nexo-app` na conta `dudinha756`.
2. Enviar os arquivos deste pacote para a branch `main` (não enviar `.env.local`).
3. Conectar o repositório em Vercel → projeto `nexo-rotina` → Settings → Git. Verificar se as variáveis do projeto foram preservadas.
4. Confirmar execução de `.github/workflows/ci.yml` e uma publicação **READY** acionada por um novo commit em `main`.
5. Testar com uma conta de teste criada diretamente no site para confirmar registro, sessão, persistência, planejamento e restauração após recarga, sem usar contas de outros aplicativos.

## Segurança

As credenciais do banco e o segredo de sessão não devem ser incluídos no GitHub. O NEXO utiliza um projeto Neon separado e requer autorização do usuário em cada chamada à API. Endpoints não autenticados são rejeitados com HTTP 401.
