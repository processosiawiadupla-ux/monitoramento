// O formato dos dados que vêm da API (o mesmo que aparece no requests.http)

export type Role = 'ADMIN' | 'GESTOR' | 'VENDEDOR';

export type Me = {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization: { id: string; name: string };
};

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
};

export type Stage = {
  id: string;
  name: string;
  color: string;
  position: number;
  kind: 'OPEN' | 'WON' | 'LOST';
};

// Um card do kanban (o que vem no GET /conversations)
export type ConversationSummary = {
  id: string;
  estimatedValue: string | null; // o Prisma devolve dinheiro como texto
  lastMessageAt: string;
  contact: { id: string; name: string | null; phone: string };
  stage: { id: string; name: string; color: string };
  assignedTo: { id: string; name: string } | null;
  messages: { body: string; author: 'CONTACT' | 'USER' | 'BOT'; createdAt: string }[];
};

// Uma mensagem completa (o que vem no GET /conversations/:id)
export type Message = {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND'; // INBOUND = do cliente, OUTBOUND = da empresa
  author: 'CONTACT' | 'USER' | 'BOT';
  body: string;
  createdAt: string;
  sentBy: { id: string; name: string } | null;
};

// A conversa completa, para o painel lateral
export type ConversationDetail = {
  id: string;
  estimatedValue: string | null;
  lastMessageAt: string;
  contact: { id: string; name: string | null; phone: string };
  stage: { id: string; name: string; color: string; kind: 'OPEN' | 'WON' | 'LOST' };
  assignedTo: { id: string; name: string } | null;
  whatsappNumber: { id: string; label: string; phone: string } | null;
  messages: Message[];
};

// Uma linha do histórico de estágios
export type StageChangeItem = {
  id: string;
  createdAt: string;
  byAi: boolean;
  fromStage: { name: string } | null;
  toStage: { name: string };
  changedBy: { name: string } | null;
};

export type WhatsAppNumberItem = {
  id: string;
  phone: string;
  label: string;
  active: boolean;
  createdAt: string;
  owner: { id: string; name: string } | null;
  _count: { conversations: number };
};

