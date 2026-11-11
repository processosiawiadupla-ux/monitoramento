import type { Role } from '@prisma/client';

// O conteúdo do token. Um JWT pode ser LIDO por qualquer um: nunca coloque senha aqui.
export interface JwtPayload {
  sub: string;   // id do usuário
  orgId: string; // empresa do usuário
  role: Role;    // ADMIN, GESTOR ou VENDEDOR
  name: string;
}