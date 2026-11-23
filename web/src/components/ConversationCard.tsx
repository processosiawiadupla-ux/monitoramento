'use client';

import { useDraggable } from '@dnd-kit/core';
import { formatBRL, formatPhone, timeAgo } from '@/lib/format';
import { formatarEspera } from '@/lib/alerta';
import type { ConversationSummary } from '@/types';

type Props = {
  conversa: ConversationSummary;
  onAbrir: (id: string) => void;
  /** Minutos aguardando resposta (null = não está aguardando) */
  espera: number | null;
  /** Limite da empresa: acima dele, o alerta fica vermelho */
  limite: number;
};

export function ConversationCard({ conversa, onAbrir, espera, limite }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: conversa.id });

  const estilo = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const ultima = conversa.messages[0];
  const atrasada = espera !== null && espera >= limite;

  return (
    <article
      ref={setNodeRef}
      style={estilo}
      {...listeners}
      {...attributes}
      onClick={() => onAbrir(conversa.id)}
      className={`cursor-pointer rounded-lg border bg-white p-3 shadow-sm hover:shadow-md ${
        isDragging ? 'z-10 opacity-80 ring-2 ring-slate-400' : ''
      } ${atrasada ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200'}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-slate-900">{conversa.contact.name ?? 'Sem nome'}</h3>
        <span className="shrink-0 text-[11px] text-slate-500">{timeAgo(conversa.lastMessageAt)}</span>
      </div>
      <p className="text-xs text-slate-500">{formatPhone(conversa.contact.phone)}</p>

      {/* Alerta de espera */}
      {espera !== null && (
        <p
          className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
            atrasada ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {atrasada ? `🔴 Sem resposta há ${formatarEspera(espera)}` : `⏳ Aguardando há ${formatarEspera(espera)}`}
        </p>
      )}

      {ultima && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-700">
          {ultima.author !== 'CONTACT' && <span className="text-slate-500">Você: </span>}
          {ultima.body}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-900">{formatBRL(conversa.estimatedValue)}</span>
        <span className="text-slate-500">{conversa.assignedTo?.name ?? 'Sem vendedor'}</span>
      </div>
    </article>
  );
}