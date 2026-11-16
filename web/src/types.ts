export type Role = 'ADMIN' | 'GESTOR' | 'VENDEDOR';

export type Me = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization: { id: string; name: string };
};
export type Stage = {
  id: string;
  name: string;
  color: string;
  position: number;
  kind: 'OPEN' | 'WON' | 'LOST';
};

export type ConversationSummary = {
  id: string;
  estimatedValue: string | null; // o Prisma devolve dinheiro como texto
  lastMessageAt: string;
  contact: { id: string; name: string | null; phone: string };
  stage: { id: string; name: string; color: string };
  assignedTo: { id: string; name: string } | null;
  messages: { body: string; author: 'CONTACT' | 'USER' | 'BOT'; createdAt: string }[];
};
export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

