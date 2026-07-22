---
name: quality-gate
description: Executa a validação completa de uma implementação do Hub Digital antes que ela seja considerada concluída.
disable-model-invocation: true
---

# Quality Gate

Analise somente as alterações realizadas na etapa atual.

Execute:

1. formatação;
2. verificação TypeScript;
3. lint;
4. testes unitários;
5. testes de integração;
6. testes de fluxo relevantes;
7. build de produção.

Revise também:

- autorização server-side;
- isolamento entre organizações;
- exposição de informações sensíveis;
- validação de entrada;
- uploads;
- ações destrutivas;
- acessibilidade;
- responsividade;
- mensagens de erro;
- documentação alterada;
- migrations;
- seed.

Não corrija problemas ocultando erros, removendo testes ou desabilitando regras.

Apresente:

- comandos executados;
- resultados reais;
- falhas;
- correções realizadas;
- riscos restantes;
- arquivos afetados.

Somente declare aprovação quando todas as verificações obrigatórias forem concluídas.