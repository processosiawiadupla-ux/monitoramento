'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
import { conectarTempoReal } from '@/lib/realtime';
import { minutosAguardando } from '@/lib/alerta';
import type { ConversationDetail, ConversationSummary, Me, Settings, Stage, UserSummary } from '@/types';
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
  const [soSemResposta, setSoSemResposta] = useState(false);

  // Painel da conversa
  const [conversaAberta, setConversaAberta] = useState<string | null>(null);

  // Tempo real
  const [aoVivo, setAoVivo] = useState(false);
  const [versaoLista, setVersaoLista] = useState(0);
  const [versaoPainel, setVersaoPainel] = useState(0);
  const conversaAbertaRef = useRef<string | null>(null);

  // Alerta de "sem resposta"
  const [limite, setLimite] = useState(30);               // minutos, vem da empresa
  const [agora, setAgora] = useState(() => Date.now());   // o "relógio" da tela

  useEffect(() => {
    conversaAbertaRef.current = conversaAberta;
  }, [conversaAberta]);

  // O relógio: bate a cada 30 segundos e faz os tempos de espera andarem
  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(relogio);
  }, []);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // 1) Quando a tela aparece: quem sou eu, estágios, limite do alerta e vendedores
  useEffect(() => {
    Promise.all([api<Me>('/auth/me'), api<Stage[]>('/stages'), api<Settings>('/settings')])
      .then(async ([me, listaStages, config]) => {
        setEu(me);
        setStages(listaStages);
        setLimite(config.responseAlertMinutes);
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

  // 2) Tempo real
  useEffect(() => {
    if (!eu) return;

    const socket = conectarTempoReal();
    socket.on('connect', () => setAoVivo(true));
    socket.on('disconnect', () => setAoVivo(false));
    socket.on('conversation.changed', (aviso: { id: string }) => {
      setVersaoLista((v) => v + 1);
      if (aviso.id === conversaAbertaRef.current) setVersaoPainel((v) => v + 1);
    });

    return () => {
      socket.disconnect();
    };
  }, [eu]);

  // 3) Busca as conversas
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
  }, [eu, busca, vendedorId, versaoLista]);

  // Quem está aguardando resposta, e há quanto tempo (refeito a cada batida do relógio)
  const esperas = useMemo(() => {
    const abertos = new Set(stages.filter((s) => s.kind === 'OPEN').map((s) => s.id));
    const mapa = new Map<string, number>();
    for (const c of conversas) {
      if (!abertos.has(c.stage.id)) continue; // ganha ou perdida: não alerta
      const minutos = minutosAguardando(c, agora);
      if (minutos !== null) mapa.set(c.id, minutos);
    }
    return mapa;
  }, [conversas, stages, agora]);

  const atrasadas = [...esperas.values()].filter((m) => m >= limite).length;

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
    setSoSemResposta(false);
  }

  function sair() {
    clearToken();
    router.replace('/login');
  }

  if (!eu) {
    return <p className="p-8 text-slate-600">Carregando...</p>;
  }

  const temFiltro = busca.trim() !== '' || vendedorId !== '' || soSemResposta;
  const visiveis = soSemResposta ? conversas.filter((c) => esperas.has(c.id)) : conversas;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">WiaPipe</h1>
          <p className="text-xs text-slate-500">{eu.organization.name}</p>
        </div>
        <div className="flex items-center gap-4">
          {atrasadas > 0 && (
            <button
              onClick={() => setSoSemResposta(true)}
              className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 hover:bg-red-200"
            >
              🔴 {atrasadas} sem resposta
            </button>
          )}
          <span className="flex items-center gap-2 text-xs text-slate-600">
            <span className={`h-2 w-2 rounded-full ${aoVivo ? 'bg-green-600' : 'bg-slate-400'}`} />
            {aoVivo ? 'Ao vivo' : 'Reconectando...'}
          </span>

          {eu.role !== 'VENDEDOR' && (
            <Link href="/admin/usuarios" className="text-sm text-slate-700 underline hover:text-slate-900">Usuários</Link>
          )}
          {eu.role === 'ADMIN' && (
            <>
              <Link href="/admin/estagios" className="text-sm text-slate-700 underline hover:text-slate-900">Estágios</Link>
              <Link href="/admin/numeros" className="text-sm text-slate-700 underline hover:text-slate-900">Números</Link>
              <Link href="/admin/regras" className="text-sm text-slate-700 underline hover:text-slate-900">Regras</Link>
            </>
          )}

          <span className="text-sm text-slate-700">
            {eu.name} · {eu.role}
          </span>
          <button onClick={sair} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100">
            Sair
          </button>
        </div>
      </header>

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
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
          <input type="checkbox" checked={soSemResposta} onChange={(e) => setSoSemResposta(e.target.checked)} />
          Só aguardando resposta
        </label>

        {temFiltro && (
          <button onClick={limparFiltros} className="rounded-lg px-3 py-2 text-sm text-slate-700 underline hover:text-slate-900">
            Limpar filtros
          </button>
        )}

        <span className="ml-auto text-sm text-slate-600">
          {visiveis.length} {visiveis.length === 1 ? 'conversa' : 'conversas'} · alerta após {limite} min
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
                conversas={visiveis.filter((c) => c.stage.id === s.id)}
                onAbrir={setConversaAberta}
                esperas={esperas}
                limite={limite}
              />
            ))}
          </div>
        </DndContext>
      </main>

      {conversaAberta && (
        <ConversationPanel
          conversaId={conversaAberta}
          stages={stages}
          versao={versaoPainel}
          onFechar={() => setConversaAberta(null)}
          onAtualizada={aoAtualizarConversa}
        />
      )}
    </div>
  );
}