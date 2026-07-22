---
name: implement-feature
description: Implementa uma funcionalidade do Hub Digital de forma incremental, respeitando arquitetura, permissões, testes e documentação.
argument-hint: "[nome da funcionalidade]"
disable-model-invocation: true
---

# Implementação incremental

Funcionalidade solicitada: $ARGUMENTS

Antes de implementar:

1. leia os requisitos relacionados;
2. consulte o plano de implementação;
3. consulte a matriz de permissões;
4. identifique a organização e o perfil envolvidos;
5. consulte o Figma quando existir uma tela correspondente;
6. consulte documentação atual das bibliotecas pelo Context7;
7. liste os arquivos que serão criados ou alterados.

Implemente seguindo a arquitetura modular existente.

Toda funcionalidade deve considerar:

- autorização server-side;
- escopo por organização;
- validação com Zod;
- estados de carregamento;
- estados vazios;
- tratamento de erros;
- responsividade;
- acessibilidade;
- auditoria quando aplicável;
- testes unitários;
- testes de fluxo quando aplicável.

Ao concluir, execute os comandos definidos pelo projeto para:

- formatação;
- typecheck;
- lint;
- testes;
- build.

Não declare a funcionalidade concluída caso algum comando falhe.