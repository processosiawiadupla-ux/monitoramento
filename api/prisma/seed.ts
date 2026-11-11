// Cria os dados iniciais para desenvolvimento.
// Rode com: npx prisma db seed
// Pode rodar várias vezes: apaga a empresa demo e recria.

import { PrismaClient, Role, StageKind } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Funil padrão: a ordem do array é a ordem das colunas no kanban
const STAGES = [
  { name: 'Novo lead', color: '#2F6FDB', kind: StageKind.OPEN },
  { name: 'Qualificação', color: '#7A4FD6', kind: StageKind.OPEN },
  { name: 'Proposta enviada', color: '#C27A00', kind: StageKind.OPEN },
  { name: 'Negociação', color: '#D2560F', kind: StageKind.OPEN },
  { name: 'Venda fechada', color: '#0B6E4F', kind: StageKind.WON },
  { name: 'Perdido', color: '#8A9097', kind: StageKind.LOST },
];

async function main() {
  const DEMO = 'Wiaflow Demo';
  const senha = 'admin12345';

  // 1) Apaga a empresa demo anterior (apaga junto tudo que é dela)
  await prisma.organization.deleteMany({ where: { name: DEMO } });

  // 2) Cria a empresa
  const org = await prisma.organization.create({ data: { name: DEMO } });

  // 3) Cria os usuários com a senha em hash (10 = "custo" do embaralhamento)
  const passwordHash = await bcrypt.hash(senha, 10);
  const usuarios = [
    { name: 'Administrador', email: 'admin@wiaflow.local', role: Role.ADMIN },
    { name: 'Gestora Paula', email: 'gestor@wiaflow.local', role: Role.GESTOR },
    { name: 'Ana', email: 'ana@wiaflow.local', role: Role.VENDEDOR },
    { name: 'Bruno', email: 'bruno@wiaflow.local', role: Role.VENDEDOR },
  ];
  for (const u of usuarios) {
    await prisma.user.create({ data: { ...u, passwordHash, organizationId: org.id } });
  }

  // 4) Cria os estágios na ordem
  for (const [position, s] of STAGES.entries()) {
    await prisma.stage.create({ data: { ...s, position, organizationId: org.id } });
  }

  console.log('✔ Seed concluído!');
  console.log(`  Logins (senha: ${senha}):`);
  usuarios.forEach((u) => console.log(`    ${u.email}  (${u.role})`));
}

main()
  .catch((err) => {
    console.error('✖ Erro no seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());