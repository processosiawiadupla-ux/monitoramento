import { useDroppable } from '@dnd-kit/core';
import type { ConversationSummary, Stage } from '@/types';
import { formatBRL } from '@/lib/format';
import { ConversationCard } from './ConversationCard';

type Props = {
  stage: Stage;
  conversas: ConversationSummary[];
};

export function StageColumn({ stage, conversas }: Props) {
  // Torna a coluna um "lugar para soltar". O id é o do estágio: é assim que,
  // ao soltar, sabemos PARA ONDE a conversa foi.
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const total = conversas.reduce((soma, c) => soma + Number(c.estimatedValue ?? 0), 0);

  return (
    <section
      ref={setNodeRef}
      aria-label={stage.name}
      className={`flex w-72 shrink-0 flex-col gap-3 rounded-xl p-3 transition-colors ${
        isOver ? 'bg-green-100 ring-2 ring-green-600' : 'bg-slate-100'
      }`}
    >
      <header>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
            {stage.name}
          </h2>
          <span className="rounded-full bg-white px-2 text-xs font-semibold text-slate-700">{conversas.length}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{total > 0 ? formatBRL(total) : 'Sem valor estimado'}</p>
      </header>

      {conversas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
          Nenhuma conversa
        </p>
      ) : (
        conversas.map((c) => <ConversationCard key={c.id} conversa={c} />)
      )}
    </section>
  );
}