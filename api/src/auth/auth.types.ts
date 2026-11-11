import type { Request } from 'express';
import type { Role } from '@prisma/client';


export interface JwtPayload {
  sub: string;   // id do usuário
  orgId: string; // empresa do usuário
  role: Role;    // ADMIN, GESTOR ou VENDEDOR
  name: string;
}


export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
}
