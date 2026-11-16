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
import type { ConversationDetail, ConversationSummary, Me, Stage, UserSummary } from '@/types';
import { StageColumn } from '@/components/StageColumn';
import { ConversationPanel } from '@/components/ConversationPanel';

export default function PipelinePage() {
  const router = useRouter();
  const [eu, setEu] = useState<Me | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [conversas, setConversas] = useState<ConversationSummary[]>([]);
  const [erro, setErro] = useState('');

  // Filtros
  const [busca, setBusca] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [vendedores, setVendedores] = useState<UserSummary[]>([]);

  // Qual conversa está aberta no painel (null = nenhuma)
  const [conversaAberta, setConversaAberta] = useState<string | null>(null);

  // Sensores do arrastar: mouse/toque (só depois de mover 5px) e teclado
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // 1) Quando a tela aparece: quem sou eu, os estágios e (se for admin/gestor) os vendedores
  useEffect(() => {
    Promise.all([api<Me>('/auth/me'), api<Stage[]>('/stages')])
      .then(async ([me, listaStages]) => {
        setEu(me);
        setStages(listaStages);
        if (me.role !== 'VENDEDOR') {
          const usuarios = await api<UserSummary[]>('/users');
          setVendedores(usuarios.filter((u) => u.role === 'VENDEDOR' && u.active));
        }
      })
      .catch(() => {
        clearToken();
        router.replace('/login');
      });
  }, [router]);

  // 2) Busca as conversas sempre que a busca ou o filtro mudam,
  //    esperando 300 ms sem digitação (debounce)
  useEffect(() => {
    if (!eu) return;

    const relogio = setTimeout(() => {
      const filtros = new URLSearchParams();
      if (busca.trim()) filtros.set('search', busca.trim());
      if (vendedorId) filtros.set('assignedToId', vendedorId);
      const qs = filtros.toString();

      api<ConversationSummary[]>(`/conversations${qs ? `?${qs}` : ''}`)
        .then((lista) => {
          setConversas(lista);
          setErro('');
        })
        .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível carregar as conversas.'));
    }, 300);

    return () => clearTimeout(relogio);
  }, [eu, busca, vendedorId]);

  // Roda quando a pessoa SOLTA um card
  async function aoSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over) return;

    const conversaId = String(active.id);
    const destinoId = String(over.id);

    const conversa = conversas.find((c) => c.id === conversaId);
    const destino = stages.find((s) => s.id === destinoId);
    if (!conversa || !destino || conversa.stage.id === destinoId) return;

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

  // O painel avisou que a conversa mudou: atualiza o card no quadro
  function aoAtualizarConversa(d: ConversationDetail) {
    setConversas((atual) =>
      atual.map((c) =>
        c.id === d.id
          ? {
              ...c,
              stage: { id: d.stage.id, name: d.stage.name, color: d.stage.color },
              estimatedValue: d.estimatedValue,
              assignedTo: d.assignedTo,
            }
          : c,
      ),
    );
  }

  function limparFiltros() {
    setBusca('');
    setVendedorId('');
  }

  function sair() {
    clearToken();
    router.replace('/login');
  }

  if (!eu) {
    return <p className="p-8 text-slate-600">Carregando...</p>;
  }

  const temFiltro = busca.trim() !== '' || vendedorId !== '';

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

      {/* Barra de busca e filtro */}
      <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <label htmlFor="busca" className="block text-xs font-medium text-slate-700">Buscar</label>
          <input
            id="busca"
            type="search"
            placeholder="Nome ou telefone"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>

        {eu.role !== 'VENDEDOR' && (
          <div>
            <label htmlFor="vendedor" className="block text-xs font-medium text-slate-700">Vendedor</label>
            <select
              id="vendedor"
              value={vendedorId}
              onChange={(e) => setVendedorId(e.target.value)}
              className="mt-1 w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            >
              <option value="">Todos</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {temFiltro && (
          <button onClick={limparFiltros} className="rounded-lg px-3 py-2 text-sm text-slate-700 underline hover:text-slate-900">
            Limpar filtros
          </button>
        )}

        <span className="ml-auto text-sm text-slate-600">
          {conversas.length} {conversas.length === 1 ? 'conversa' : 'conversas'}
        </span>
      </div>

      {erro && (
        <p role="alert" className="mx-6 mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {erro}
        </p>
      )}

      <main className="flex-1 overflow-x-auto p-6">
        <DndContext sensors={sensores} onDragEnd={aoSoltar}>
          <div className="flex items-start gap-4">
            {stages.map((s) => (
              <StageColumn
                key={s.id}
                stage={s}
                conversas={conversas.filter((c) => c.stage.id === s.id)}
                onAbrir={setConversaAberta}
              />
            ))}
          </div>
        </DndContext>
      </main>

      {/* Painel da conversa (só aparece se alguma estiver aberta) */}
      {conversaAberta && (
        <ConversationPanel
          conversaId={conversaAberta}
          stages={stages}
          onFechar={() => setConversaAberta(null)}
          onAtualizada={aoAtualizarConversa}
        />
      )}
    </div>
  );
}

