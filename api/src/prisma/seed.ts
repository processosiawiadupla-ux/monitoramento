import { MessageAuthor, MessageDirection, PrismaClient, Role, StageKind } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const STAGES = [
  { name: 'Novo lead', color: '#2F6FDB', kind: StageKind.OPEN },
  { name: 'Proposta enviada', color: '#C27A00', kind: StageKind.OPEN },
  { name: 'Negociação', color: '#D2560F', kind: StageKind.OPEN },
  { name: 'Venda fechada', color: '#0B6E4F', kind: StageKind.WON },
  { name: 'Perdido', color: '#8A9097', kind: StageKind.LOST },
];

// minutosAtras(30) = data/hora de 30 minutos atrás
const minutosAtras = (min: number) => new Date(Date.now() - min * 60_000);

async function main() {
  const DEMO = 'Wiaflow Demo';
  const senha = 'admin12345';

  await prisma.organization.deleteMany({ where: { name: DEMO } });
  const org = await prisma.organization.create({ data: { name: DEMO } });

  // ---------- Usuários ----------
  const passwordHash = await bcrypt.hash(senha, 10);
  const criarUsuario = (name: string, email: string, role: Role) =>
    prisma.user.create({ data: { name, email, role, passwordHash, organizationId: org.id } });

  const admin = await criarUsuario('Administrador', 'admin@wiaflow.local', Role.ADMIN);
  await criarUsuario('Gestora Paula', 'gestor@wiaflow.local', Role.GESTOR);
  const ana = await criarUsuario('Ana', 'ana@wiaflow.local', Role.VENDEDOR);
  const bruno = await criarUsuario('Bruno', 'bruno@wiaflow.local', Role.VENDEDOR);

  // ---------- Estágios ----------
  const stages = [];
  for (const [position, s] of STAGES.entries()) {
    stages.push(await prisma.stage.create({ data: { ...s, position, organizationId: org.id } }));
  }
  const [novo, qualificacao, proposta, negociacao, ganho, perdido] = stages;

  // ---------- Conversas de exemplo ----------
  // from: 'c' = cliente, 'v' = vendedor   |   ago = minutos atrás
  const exemplos = [
    { nome: 'Mariana Souza', fone: '5511987654321', stage: novo, vendedor: ana, valor: null,
      msgs: [{ from: 'c', text: 'Oi! Vi o anúncio do plano anual. Ainda está com desconto?', ago: 12 }] },
    { nome: 'Roberto Lima', fone: '5519998123344', stage: novo, vendedor: bruno, valor: null,
      msgs: [{ from: 'c', text: 'Boa tarde, vocês atendem em Campinas?', ago: 48 }] },
    { nome: 'Felipe Andrade', fone: '5511991207788', stage: qualificacao, vendedor: ana, valor: 1800,
      msgs: [
        { from: 'v', text: 'Felipe, quantos usuários vocês teriam?', ago: 95 },
        { from: 'c', text: 'Uns 3. Pode me mandar os valores por escrito?', ago: 75 },
      ] },
    { nome: 'Juliana Prado', fone: '5531984441020', stage: qualificacao, vendedor: bruno, valor: 2400,
      msgs: [
        { from: 'c', text: 'Somos uma equipe de 6 pessoas.', ago: 40 },
        { from: 'v', text: 'Perfeito, Juliana. Vocês já usam alguma ferramenta hoje?', ago: 33 },
      ] },
    { nome: 'Clínica Vida Plena', fone: '554133229090', stage: proposta, vendedor: bruno, valor: 9600,
      msgs: [
        { from: 'v', text: 'Dra. Renata, segue a proposta em PDF.', ago: 140 },
        { from: 'c', text: 'Recebi. Conseguem parcelar em 6x?', ago: 130 },
        { from: 'v', text: 'Vou verificar com o financeiro e te retorno hoje.', ago: 120 },
      ] },
    { nome: 'Patrícia Gomes', fone: '5511973334455', stage: negociacao, vendedor: ana, valor: 5400,
      msgs: [
        { from: 'v', text: 'Consegui 10% à vista para você, Patrícia.', ago: 40 },
        { from: 'c', text: 'Fechado! Me manda o link de pagamento?', ago: 20 },
      ] },
    { nome: 'Eduardo Rocha', fone: '5562995556677', stage: ganho, vendedor: bruno, valor: 4800,
      msgs: [
        { from: 'c', text: 'Pagamento feito!', ago: 300 },
        { from: 'v', text: 'Recebido, Eduardo! Já te mando o acesso.', ago: 298 },
      ] },
    { nome: 'Larissa Melo', fone: '5548986663030', stage: perdido, vendedor: ana, valor: 2000,
      msgs: [
        { from: 'c', text: 'Obrigada, mas fechamos com outra empresa.', ago: 900 },
        { from: 'v', text: 'Entendo, Larissa. Fico à disposição!', ago: 895 },
      ] },
  ];

  for (const ex of exemplos) {
    const doCliente = ex.msgs.filter((m) => m.from === 'c');
    const daEmpresa = ex.msgs.filter((m) => m.from !== 'c');
    const ultima = ex.msgs[ex.msgs.length - 1];

    await prisma.conversation.create({
      data: {
        organization: { connect: { id: org.id } },
        contact: { create: { name: ex.nome, phone: ex.fone, organizationId: org.id } },
        stage: { connect: { id: ex.stage.id } },
        assignedTo: { connect: { id: ex.vendedor.id } },
        estimatedValue: ex.valor,
        lastMessageAt: minutosAtras(ultima.ago),
        lastInboundAt: doCliente.length ? minutosAtras(doCliente[doCliente.length - 1].ago) : null,
        lastOutboundAt: daEmpresa.length ? minutosAtras(daEmpresa[daEmpresa.length - 1].ago) : null,
        messages: {
          create: ex.msgs.map((m) => ({
            direction: m.from === 'c' ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
            author: m.from === 'c' ? MessageAuthor.CONTACT : MessageAuthor.USER,
            body: m.text,
            sentById: m.from === 'c' ? null : ex.vendedor.id,
            createdAt: minutosAtras(m.ago),
          })),
        },
        stageChanges: { create: { toStageId: ex.stage.id, changedById: admin.id } },
      },
    });
  }

  console.log('✔ Seed concluído!');
  console.log(`  ${exemplos.length} conversas criadas`);
  console.log(`  Logins (senha: ${senha}): admin@, gestor@, ana@, bruno@ wiaflow.local`);
}

main()
  .catch((err) => {
    console.error('✖ Erro no seed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

  