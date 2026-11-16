'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import type { ConversationSummary, Me, Stage } from '@/types';
import { StageColumn } from '@/components/StageColumn';
export default function PipelinePage() {
  const router = useRouter();
  const [eu, setEu] = useState<Me | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [conversas, setConversas] = useState<ConversationSummary[]>([]);

  // Quando a tela aparece: busca os 3 dados AO MESMO TEMPO
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

      <main className="flex-1 overflow-x-auto p-6">
        <div className="flex items-start gap-4">
          {stages.map((s) => (
            <StageColumn key={s.id} stage={s} conversas={conversas.filter((c) => c.stage.id === s.id)} />
          ))}
        </div>
      </main>
    </div>
  );
}

