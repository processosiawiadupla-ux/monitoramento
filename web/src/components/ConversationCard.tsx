import { useDraggable } from '@dnd-kit/core';
import type { ConversationSummary } from '@/types';
import { formatBRL, formatPhone, timeAgo } from '@/lib/format';

type Props = {
  conversa: ConversationSummary;
};

export function ConversationCard({ conversa }: Props) {
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: conversa.id,
  });

  const estilo = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const ultima = conversa.messages[0];
  const previa = !ultima
    ? 'Sem mensagens'
    : ultima.author === 'CONTACT'
      ? ultima.body
      : `Você: ${ultima.body}`;

  return (
    <article
      ref={setNodeRef}
      style={estilo}
      {...listeners}
      {...attributes}
      className={`cursor-grab rounded-lg border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing ${
        isDragging ? 'relative z-10 opacity-80 shadow-lg ring-2 ring-green-600' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{conversa.contact.name ?? 'Sem nome'}</p>
          <p className="text-xs text-slate-500">{formatPhone(conversa.contact.phone)}</p>
        </div>
        <span className="shrink-0 text-xs text-slate-500">{timeAgo(conversa.lastMessageAt)}</span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-slate-700">{previa}</p>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
        <span className="text-sm font-semibold text-slate-900">{formatBRL(conversa.estimatedValue)}</span>
        <span className="text-xs text-slate-600">{conversa.assignedTo?.name ?? 'Sem vendedor'}</span>
      </div>
    </article>
  );
}
