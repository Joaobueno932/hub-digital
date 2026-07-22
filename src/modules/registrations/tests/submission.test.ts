import { describe, expect, it } from "vitest";
import {
  buildInnovationSpacePayload,
  buildStartupPayload,
  innovationSpaceSubmissionSchema,
  startupSubmissionSchema,
} from "../schemas/submission";
import { organizationPayloadSchema } from "../schemas/payloads";

const validStartup = {
  responsibleName: "  Maria   Silva ",
  email: "  Maria@Exemplo.COM ",
  phone: " (67) 99999-0000 ",
  startupName: " Startup X ",
  description: "Uma startup que resolve um problema real do mercado.",
  stage: "HAVE_IDEA",
  city: " Campo  Grande ",
  state: "MS",
  website: "https://startupx.com",
  acceptedTerms: true,
  acceptedPrivacy: true,
  companyWebsite: "",
};

const validSpace = {
  responsibleName: "João Souza",
  email: "joao@exemplo.com",
  spaceName: "Espaço Inovar",
  description: "Espaço de inovação para startups locais.",
  city: "Dourados",
  state: "MS",
  acceptedTerms: true,
  acceptedPrivacy: true,
  companyWebsite: "",
};

describe("startupSubmissionSchema", () => {
  it("aceita e normaliza dados válidos", () => {
    const r = startupSubmissionSchema.parse(validStartup);
    expect(r.responsibleName).toBe("Maria Silva");
    expect(r.email).toBe("maria@exemplo.com");
    expect(r.city).toBe("Campo Grande");
  });

  it("exige campos obrigatórios", () => {
    expect(
      startupSubmissionSchema.safeParse({ ...validStartup, startupName: "" })
        .success,
    ).toBe(false);
    expect(
      startupSubmissionSchema.safeParse({ ...validStartup, city: "" }).success,
    ).toBe(false);
    expect(
      startupSubmissionSchema.safeParse({
        ...validStartup,
        description: "curta",
      }).success,
    ).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    expect(
      startupSubmissionSchema.safeParse({ ...validStartup, email: "nao-email" })
        .success,
    ).toBe(false);
  });

  it("rejeita UF inválida e estágio inválido", () => {
    expect(
      startupSubmissionSchema.safeParse({ ...validStartup, state: "ZZ" })
        .success,
    ).toBe(false);
    expect(
      startupSubmissionSchema.safeParse({ ...validStartup, stage: "FOO" })
        .success,
    ).toBe(false);
  });

  it("aceita website vazio (opcional) e rejeita URL inválida", () => {
    expect(
      startupSubmissionSchema.safeParse({ ...validStartup, website: "" })
        .success,
    ).toBe(true);
    expect(
      startupSubmissionSchema.safeParse({ ...validStartup, website: "nao-url" })
        .success,
    ).toBe(false);
  });

  it("exige aceite dos termos e da privacidade", () => {
    expect(
      startupSubmissionSchema.safeParse({
        ...validStartup,
        acceptedTerms: false,
      }).success,
    ).toBe(false);
    expect(
      startupSubmissionSchema.safeParse({
        ...validStartup,
        acceptedPrivacy: false,
      }).success,
    ).toBe(false);
  });

  it("rejeita honeypot preenchido", () => {
    expect(
      startupSubmissionSchema.safeParse({
        ...validStartup,
        companyWebsite: "http://bot",
      }).success,
    ).toBe(false);
  });

  it("aplica limite de tamanho", () => {
    expect(
      startupSubmissionSchema.safeParse({
        ...validStartup,
        description: "a".repeat(601),
      }).success,
    ).toBe(false);
  });
});

describe("innovationSpaceSubmissionSchema", () => {
  it("aceita dados válidos com instituição opcional", () => {
    expect(innovationSpaceSubmissionSchema.safeParse(validSpace).success).toBe(
      true,
    );
    expect(
      innovationSpaceSubmissionSchema.safeParse({
        ...validSpace,
        institution: "Universidade X",
      }).success,
    ).toBe(true);
  });

  it("exige nome do espaço", () => {
    expect(
      innovationSpaceSubmissionSchema.safeParse({
        ...validSpace,
        spaceName: "",
      }).success,
    ).toBe(false);
  });
});

describe("payload compatível com a aprovação", () => {
  it("payload de startup é aceito por organizationPayloadSchema", () => {
    const payload = buildStartupPayload(
      startupSubmissionSchema.parse(validStartup),
    );
    expect(payload.organizationName).toBe("Startup X");
    expect(payload.contactEmail).toBe("maria@exemplo.com");
    expect(payload.source).toBe("public_form");
    expect(organizationPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("payload de espaço é aceito por organizationPayloadSchema", () => {
    const payload = buildInnovationSpacePayload(
      innovationSpaceSubmissionSchema.parse(validSpace),
    );
    expect(payload.organizationName).toBe("Espaço Inovar");
    expect(organizationPayloadSchema.safeParse(payload).success).toBe(true);
  });
});
