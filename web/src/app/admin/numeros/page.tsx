'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import { formatPhone } from '@/lib/format';
import type { Me, UserSummary, WhatsAppNumberItem } from '@/types';

export default function NumerosPage() {
  const router = useRouter();
  const [eu, setEu] = useState<Me | null>(null);
  const [numeros, setNumeros] = useState<WhatsAppNumberItem[]>([]);
  const [pessoas, setPessoas] = useState<UserSummary[]>([]); // quem pode ser dona
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  // Novo número
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [donaId, setDonaId] = useState('');

  const carregar = useCallback(async () => {
    const [lista, usuarios] = await Promise.all([
      api<WhatsAppNumberItem[]>('/whatsapp-numbers'),
      api<UserSummary[]>('/users'),
    ]);
    setNumeros(lista);
    setPessoas(usuarios.filter((u) => u.active && u.role === 'VENDEDOR'));
  }, []);

  // Só ADMIN entra aqui
  useEffect(() => {
    api<Me>('/auth/me')
      .then(async (me) => {
        if (me.role !== 'ADMIN') {
          router.replace('/pipeline');
          return;
        }
        setEu(me);
        await carregar();
      })
      .catch(() => {
        clearToken();
        router.replace('/login');
      });
  }, [router, carregar]);

  function limparAvisos() {
    setErro('');
    setAviso('');
  }

  function mostrarErro(falha: unknown, padrao: string) {
    setErro(falha instanceof Error ? falha.message : padrao);
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    limparAvisos();
    try {
      await api('/whatsapp-numbers', {
        method: 'POST',
        body: JSON.stringify({ phone: telefone, label: nome, ownerId: donaId || null }),
      });
      setTelefone('');
      setNome('');
      setDonaId('');
      setAviso('Número cadastrado.');
      await carregar();
    } catch (falha) {
      mostrarErro(falha, 'Não foi possível cadastrar o número.');
    }
  }

  async function alterar(numero: WhatsAppNumberItem, dados: { label?: string; ownerId?: string | null; active?: boolean }) {
    limparAvisos();
    if (dados.label !== undefined) {
      dados.label = dados.label.trim();
      if (!dados.label || dados.label === numero.label) return; // nada mudou
    }
    try {
      const atualizado = await api<WhatsAppNumberItem>(`/whatsapp-numbers/${numero.id}`, {
        method: 'PATCH',
        body: JSON.stringify(dados),
      });
      setNumeros((lista) => lista.map((n) => (n.id === atualizado.id ? atualizado : n)));
      setAviso('Salvo.');
    } catch (falha) {
      mostrarErro(falha, 'Não foi possível salvar.');
      await carregar();
    }
  }

  if (!eu) return <p className="p-8 text-slate-600">Carregando...</p>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Números de WhatsApp</h1>
          <p className="text-xs text-slate-500">{eu.organization.name}</p>
        </div>
        <Link href="/pipeline" className="text-sm text-slate-700 underline hover:text-slate-900">
          ← Voltar ao pipeline
        </Link>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">
        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>
        )}
        {aviso && (
          <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{aviso}</p>
        )}

        <p className="text-sm text-slate-600">
          As conversas que chegarem por um número vão automaticamente para a dona dele.
          Trocar a dona vale para as conversas <strong>novas</strong>; as antigas continuam com quem já atendia.
        </p>

        {/* Lista */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Número</th>
                <th className="px-4 py-2 font-medium">Dona</th>
                <th className="px-4 py-2 font-medium">Conversas</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {numeros.map((n) => (
                <tr key={n.id} className={`border-t border-slate-100 ${n.active ? '' : 'text-slate-400'}`}>
                  <td className="px-4 py-2">
                    <input
                      key={n.id + n.label}
                      defaultValue={n.label}
                      aria-label="Nome do número"
                      onBlur={(e) => alterar(n, { label: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-44 rounded-md border border-slate-300 px-2 py-1 text-slate-900"
                    />
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">{formatPhone(n.phone)}</td>
                  <td className="px-4 py-2">
                    <select
                      value={n.owner?.id ?? ''}
                      onChange={(e) => alterar(n, { ownerId: e.target.value || null })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-slate-900"
                    >
                      <option value="">Nenhuma vendedora</option>
                      {pessoas.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">{n._count.conversations}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${n.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {n.active ? 'Ativo' : 'Desativado'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => alterar(n, { active: !n.active })}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                    >
                      {n.active ? 'Desativar' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}
              {numeros.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">Nenhum número cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Novo número */}
        <form onSubmit={criar} className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Novo número</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              Número (com DDD)
              <input required value={telefone} onChange={(e) => setTelefone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="text-sm text-slate-700">
              Nome
              <input required value={nome} onChange={(e) => setNome(e.target.value)}
                placeholder="Comercial · Carla"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="text-sm text-slate-700">
              Dona
              <select value={donaId} onChange={(e) => setDonaId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
                <option value="">Sem dona por enquanto</option>
                {pessoas.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit"
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Cadastrar número
          </button>
        </form>
      </main>
    </div>
  );
}