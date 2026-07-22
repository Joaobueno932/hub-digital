/**
 * Interface de envio de e-mail de convite, preparada para implementação
 * futura. Envio real não está implementado nesta etapa — o console sender
 * apenas registra em log de desenvolvimento, nunca "simula" um envio real
 * nem é usado em produção sem substituição.
 */
export interface InvitationEmailSender {
  send(input: {
    to: string;
    organizationName: string;
    inviteUrl: string;
  }): Promise<void>;
}

export class ConsoleInvitationEmailSender implements InvitationEmailSender {
  async send(input: {
    to: string;
    organizationName: string;
    inviteUrl: string;
  }): Promise<void> {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[dev] Convite para ${input.to} (${input.organizationName}): ${input.inviteUrl}`,
      );
    }
  }
}
