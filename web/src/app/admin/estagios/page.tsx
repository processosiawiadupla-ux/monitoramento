'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import type { Me, Stage } from '@/types';

// O estágio como a API devolve: com a contagem de conversas
type Estagio = Stage & { _count?: { conversations?: number } };

// Cores que o admin pode escolher
const CORES = ['#2F6FDB', '#7A4FD6', '#C27A00', '#D2560F', '#0B6E4F', '#8A9097', '#C2185B', '#00838F'];

export default function EstagiosPage() {
  const router = useRouter();
  const [eu, setEu] = useState<Me | null>(null);
  const [estagios, setEstagios] = useState<Estagio[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  // Novo estágio
  const [novoNome, setNovoNome] = useState('');
  const [novaCor, setNovaCor] = useState(CORES[0]);

  // Arquivar: qual estágio está sendo arquivado e para onde vão as conversas
  const [arquivando, setArquivando] = useState<string | null>(null);
  const [destino, setDestino] = useState('');

  const carregar = useCallback(async () => {
    setEstagios(await api<Estagio[]>('/stages'));
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

  /** Renomear ou trocar a cor */
  async function salvar(estagio: Estagio, dados: { name?: string; color?: string }) {
    limparAvisos();
    if (dados.name !== undefined) {
      dados.name = dados.name.trim();
      if (!dados.name || dados.name === estagio.name) return; // nada mudou
    }
    try {
      await api(`/stages/${estagio.id}`, { method: 'PATCH', body: JSON.stringify(dados) });
      setAviso('Salvo.');
    } catch (falha) {
      mostrarErro(falha, 'Não foi possível salvar.');
    }
    await carregar();
  }

  /** Troca o estágio de lugar com o vizinho de cima (-1) ou de baixo (+1) */
  async function mover(indice: number, direcao: -1 | 1) {
    const vizinho = indice + direcao;
    if (vizinho < 0 || vizinho >= estagios.length) return;
    limparAvisos();

    const novaOrdem = [...estagios];
    [novaOrdem[indice], novaOrdem[vizinho]] = [novaOrdem[vizinho], novaOrdem[indice]];
    setEstagios(novaOrdem); // muda na tela na hora (otimista)

    try {
      await api('/stages/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ ids: novaOrdem.map((s) => s.id) }),
      });
    } catch (falha) {
      mostrarErro(falha, 'Não foi possível reordenar.');
      await carregar(); // desfaz, voltando ao que está no banco
    }
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    limparAvisos();
    try {
      await api('/stages', {
        method: 'POST',
        body: JSON.stringify({ name: novoNome.trim(), color: novaCor }),
      });
      setNovoNome('');
      setAviso('Estágio criado. Ele entra no fim do pipeline.');
      await carregar();
    } catch (falha) {
      mostrarErro(falha, 'Não foi possível criar o estágio.');
    }
  }

  async function confirmarArquivar(estagio: Estagio) {
    limparAvisos();
    const qtd = estagio._count?.conversations ?? 0;
    if (qtd > 0 && !destino) {
      setErro('Escolha para qual estágio vão as conversas.');
      return;
    }
    try {
      const qs = destino ? `?moveTo=${destino}` : '';
      await api(`/stages/${estagio.id}${qs}`, { method: 'DELETE' });
      setArquivando(null);
      setDestino('');
      setAviso(`"${estagio.name}" foi arquivado.`);
      await carregar();
    } catch (falha) {
      mostrarErro(falha, 'Não foi possível arquivar.');
    }
  }

  if (!eu) return <p className="p-8 text-slate-600">Carregando...</p>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Estágios do pipeline</h1>
          <p className="text-xs text-slate-500">{eu.organization.name}</p>
        </div>
        <Link href="/pipeline" className="text-sm text-slate-700 underline hover:text-slate-900">
          ← Voltar ao pipeline
        </Link>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-6">
        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>
        )}
        {aviso && (
          <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{aviso}</p>
        )}

        {/* Lista de estágios, na ordem do pipeline */}
        <ul className="space-y-2">
          {estagios.map((s, i) => {
            const qtd = s._count?.conversations ?? 0;
            return (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Ordem */}
                  <div className="flex flex-col">
                    <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${s.name}`}
                      className="px-2 text-slate-600 hover:text-slate-900 disabled:opacity-30">↑</button>
                    <button onClick={() => mover(i, 1)} disabled={i === estagios.length - 1} aria-label={`Descer ${s.name}`}
                      className="px-2 text-slate-600 hover:text-slate-900 disabled:opacity-30">↓</button>
                  </div>

                  {/* Nome: salva ao sair do campo */}
                  <input
                    key={s.id + s.name}
                    defaultValue={s.name}
                    aria-label="Nome do estágio"
                    onBlur={(e) => salvar(s, { name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900"
                  />

                  {/* Cor */}
                  <div className="flex gap-1">
                    {CORES.map((cor) => (
                      <button key={cor} onClick={() => salvar(s, { color: cor })} aria-label={`Cor ${cor}`}
                        className={`h-5 w-5 rounded-full ${s.color === cor ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                        style={{ backgroundColor: cor }} />
                    ))}
                  </div>

                  <span className="text-xs text-slate-500">
                    {qtd} {qtd === 1 ? 'conversa' : 'conversas'}
                    {s.kind === 'WON' && ' · venda ganha'}
                    {s.kind === 'LOST' && ' · perdida'}
                  </span>

                  <button onClick={() => { limparAvisos(); setArquivando(s.id); setDestino(''); }}
                    className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                    Arquivar
                  </button>
                </div>

                {/* Confirmação de arquivar */}
                {arquivando === s.id && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                    <span>
                      {qtd > 0 ? `Mover as ${qtd} conversas para:` : 'Arquivar este estágio?'}
                    </span>
                    {qtd > 0 && (
                      <select value={destino} onChange={(e) => setDestino(e.target.value)}
                        className="rounded-md border border-amber-300 bg-white px-2 py-1 text-slate-900">
                        <option value="">Escolha...</option>
                        {estagios.filter((o) => o.id !== s.id).map((o) => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    )}
                    <button onClick={() => confirmarArquivar(s)}
                      className="rounded-md bg-amber-700 px-3 py-1 text-white hover:bg-amber-800">
                      Confirmar
                    </button>
                    <button onClick={() => setArquivando(null)} className="px-2 py-1 underline">
                      Cancelar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Novo estágio */}
        <form onSubmit={criar} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm text-slate-700">
            Novo estágio
            <input required value={novoNome} onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex.: Aguardando pagamento"
              className="mt-1 block w-64 rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
          </label>
          <div className="flex gap-1 pb-2">
            {CORES.map((cor) => (
              <button type="button" key={cor} onClick={() => setNovaCor(cor)} aria-label={`Cor ${cor}`}
                className={`h-5 w-5 rounded-full ${novaCor === cor ? 'ring-2 ring-slate-900 ring-offset-1' : ''}`}
                style={{ backgroundColor: cor }} />
            ))}
          </div>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Criar estágio
          </button>
        </form>
      </main>
    </div>
  );
}