'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { api, clearToken } from '@/lib/api';
import type { ConversationSummary, Me, Stage } from '@/types';
import { StageColumn } from '@/components/StageColumn';

export default function PipelinePage() {
  const router = useRouter();
  const [eu, setEu] = useState<Me | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [conversas, setConversas] = useState<ConversationSummary[]>([]);
  const [erro, setErro] = useState('');

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  useEffect(() => {
    Promise.all([
      api<Me>('/auth/me'),
      api<Stage[]>('/stages'),
      api<ConversationSummary[]>('/conversations'),
    ])
      .then(([me, listaStages, listaConversas]) => {
        setEu(me);
        setStages(listaStages);
        setConversas(listaConversas);
      })
      .catch(() => {
        clearToken();
        router.replace('/login');
      });
  }, [router]);


  async function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over) return; 

    const conversaId = String(active.id); 
    const destinoId = String(over.id);    

    const conversa = conversas.find((c) => c.id === conversaId);
    const destino = stages.find((s) => s.id === destinoId);
    if (!conversa || !destino || conversa.stage.id === destinoId) return; // mesma coluna: nada a fazer


    const antes = conversas;


    setErro('');
    setConversas((atual) =>
      atual.map((c) =>
        c.id === conversaId ? { ...c, stage: { id: destino.id, name: destino.name, color: destino.color } } : c,
      ),
    );

    try {
      await api(`/conversations/${conversaId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId: destinoId }),
      });
    } catch (e) {
      setConversas(antes);
      setErro(e instanceof Error ? e.message : 'Não foi possível mover a conversa.');
    }
  }

  function sair() {
    clearToken();
    router.replace('/login');
  }

  if (!eu) {
    return <p className="p-8 text-slate-600">Carregando...</p>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">WiaPipe</h1>
          <p className="text-xs text-slate-500">{eu.organization.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-700">
            {eu.name} · {eu.role}
          </span>
          <button onClick={sair} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
            Sair
          </button>
        </div>
      </header>

      {erro && (
        <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <main className="flex-1 overflow-x-auto p-6">
        <DndContext sensors={sensores} onDragEnd={aoSoltar}>
          <div className="flex items-start gap-4">
            {stages.map((s) => (
              <StageColumn key={s.id} stage={s} conversas={conversas.filter((c) => c.stage.id === s.id)} />
            ))}
          </div>
        </DndContext>
      </main>
    </div>
  );
}