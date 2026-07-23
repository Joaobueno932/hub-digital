import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // Com driver adapter (pg), os parâmetros Prisma da URL (`connection_limit`,
  // `pool_timeout`) são IGNORADOS — quem manda é o `pg.Pool`. Sem `max`, o
  // padrão do pg é 10 e a espera por conexão é infinita: sob a carga acumulada
  // da suíte E2E o pool esgotava e as Server Actions ficavam presas ("travadas")
  // esperando conexão. Definimos um `max` maior e um timeout de aquisição para
  // que a falta de conexão vire erro rápido em vez de um travamento silencioso.
  const max = Number(process.env.DB_POOL_MAX ?? 20);
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

// Cache do client em todos os ambientes: garante um ÚNICO pool por processo,
// independentemente de como o Next agrupa os módulos entre rotas.
export const prisma = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = prisma;
