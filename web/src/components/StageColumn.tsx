'use client';

import { useDroppable } from '@dnd-kit/core';
import { formatBRL } from '@/lib/format';
import type { ConversationSummary, Stage } from '@/types';
import { ConversationCard } from './ConversationCard';

type Props = {
  stage: Stage;
  conversas: ConversationSummary[];
  onAbrir: (id: string) => void;
  /** id da conversa → minutos aguardando (só as que estão aguardando) */
  esperas: Map<string, number>;
  limite: number;
};

export function StageColumn({ stage, conversas, onAbrir, esperas, limite }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const total = conversas.reduce((soma, c) => soma + Number(c.estimatedValue ?? 0), 0);

  return (
    <section
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl bg-slate-100 p-3 ${isOver ? 'ring-2 ring-slate-400' : ''}`}
    >
      <header className="mb-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h2 className="text-sm font-semibold text-slate-900">{stage.name}</h2>
          <span className="ml-auto rounded-full bg-white px-2 text-xs text-slate-600">{conversas.length}</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{formatBRL(total)}</p>
      </header>

      <div className="flex flex-col gap-2">
        {conversas.length === 0 && <p className="py-4 text-center text-xs text-slate-500">Nenhuma conversa</p>}
        {conversas.map((c) => (
          <ConversationCard
            key={c.id}
            conversa={c}
            onAbrir={onAbrir}
            espera={esperas.get(c.id) ?? null}
            limite={limite}
          />
        ))}
      </div>
    </section>
  );
}