# Matriz de permissões — Hub Digital (Fase 1)

Legenda de origem: **C** = confirmada pelo documento de requisitos; **P** = proposta (decisão técnica coerente com o material); **V** = pendente de validação pela gestão.

Papéis: SA = SUPER_ADMIN, AH = ADM_HUB, AE = ADM_ESPACO_INOVACAO, UE = USUARIO_ESPACO_INOVACAO, AS = ADM_STARTUP, US = USUARIO_EQUIPE_STARTUP, UC = USUARIO_COMUM.

Escopo: permissões de AE/UE valem apenas na organização (espaço) do vínculo; AS/US apenas na startup do vínculo. SA/AH têm escopo global (vínculo na organização Hub). SUPER_ADMIN recebe todas as permissões (P).

## Portal / plataforma

| Permissão (code)                                  | SA  | AH  | AE        | UE  | AS        | US  | UC  | Origem                                                |
| ------------------------------------------------- | --- | --- | --------- | --- | --------- | --- | --- | ----------------------------------------------------- |
| users.list                                        | ✓   | ✓   | ✓(escopo) | –   | –         | –   | –   | C (US-04)                                             |
| users.view                                        | ✓   | ✓   | ✓(escopo) | –   | ✓(escopo) | –   | –   | P                                                     |
| users.create                                      | ✓   | ✓   | ✓(escopo) | –   | –         | –   | –   | C (US-01)                                             |
| users.update                                      | ✓   | ✓   | ✓(escopo) | –   | –         | –   | –   | C (US-02)                                             |
| users.deactivate                                  | ✓   | ✓   | ✓(escopo) | –   | –         | –   | –   | C (US-03, como exclusão lógica — V para escopo exato) |
| registrations.list / view                         | ✓   | ✓   | –         | –   | –         | –   | –   | C (story map AH)                                      |
| registrations.approve / reject                    | ✓   | ✓   | –         | –   | –         | –   | –   | C (US-07/08)                                          |
| organizations.list / view                         | ✓   | ✓   | –         | –   | –         | –   | –   | P                                                     |
| organizations.create / update                     | ✓   | ✓   | –         | –   | –         | –   | –   | P (V: quem cria organizações?)                        |
| organizations.update.own                          | –   | –   | ✓         | –   | ✓         | –   | –   | P                                                     |
| members.manage (vínculos e papéis na própria org) | ✓   | ✓   | ✓         | –   | ✓         | –   | –   | C parcial (US-16 AE solicita cadastro; CLAUDE.md)     |
| roles.manage / permissions.manage                 | ✓   | ✓   | –         | –   | –         | –   | –   | P (V: AE cria papéis personalizados?)                 |
| plans.manage                                      | ✓   | ✓   | –         | –   | –         | –   | –   | C (US-15)                                             |
| plans.view                                        | ✓   | ✓   | ✓         | ✓   | ✓         | ✓   | ✓   | C                                                     |
| feature-flags.manage                              | ✓   | ✓   | –         | –   | –         | –   | –   | P                                                     |
| audit.view                                        | ✓   | ✓   | –         | –   | –         | –   | –   | P                                                     |
| notifications.view.own                            | ✓   | ✓   | ✓         | ✓   | ✓         | ✓   | ✓   | P                                                     |
| onboarding.complete.own                           | ✓   | ✓   | ✓         | ✓   | ✓         | ✓   | ✓   | C (GP US-03)                                          |
| dashboard.view                                    | ✓   | ✓   | ✓         | ✓   | ✓         | ✓   | ✓*  | C (painéis por perfil; *UC limitado — V)              |

## Futuras (previstas, não implementadas — todas V quanto ao detalhe)

- Vagas: `jobs.manage` AH/AE (C: US-09..11); `jobs.apply` UC (C: US-37).
- Serviços: `services.manage` AH (C: US-12..14); `services.request` AE/AS/US (C: US-25, GP US-16..19).
- Eventos: `events.create` AH/AE/UE (C); `events.approve` AH/AE (C); `events.participate` todos (C).
- Coworking: `rooms.manage` AE (C); `bookings.create` todos logados (C); `coworking.reports` AH/AE/AS (C).
- Ideação: `campaigns.manage` AH/AE/UE (C RN17); `challenges.manage` AS (C RN18); `ideas.participate` AS/US/UC (C); `evaluations.manage` AH/AE/UE (C).
- Projetos: `maturity.answer` líder da startup (C RN-01); `workplans.manage` AE/UE (C US-11..13); `progress.view` AS/US (C).
- Tendências: `bi.manage` AH (C US-01..05); `reports.create` AH/AE (C); `reports.approve` AH (C RN-03); `reports.buy` todos (C US-12).
- Conexões/mentorias/agenda: AE/UE/AS/US (C US-17..24, US-30..32).

> Etapa 1.7: solicitações institucionais públicas (`/cadastro/startup`, `/cadastro/espaco-inovacao`) exigem apenas **autenticação** (qualquer usuário logado pode enviar); não requerem permissão específica. `/app/minhas-solicitacoes` é escopado ao próprio usuário (sem permissão). A análise (aprovar/reprovar) permanece restrita a `registrations.approve`/`registrations.reject` (ADM_HUB/SUPER_ADMIN).

> Implementação (Etapa 1.4): SUPER_ADMIN recebe todas as permissões em qualquer escopo; papéis de vínculos em organização tipo HUB (ADM_HUB) têm escopo global para suas permissões; os demais valem apenas na organização do vínculo. Código: `src/modules/permissions/services/authorization.ts`.

## Regras de aplicação

1. Autorização sempre no servidor; o menu apenas reflete permissões.
2. Verificação = sessão válida + membership ativo na organização ativa + permissão via papel + escopo do recurso (anti-IDOR).
3. Ações administrativas geram AuditLog.
4. UC sem vínculo opera sem organização ativa, apenas com permissões `.own`.
