'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import type { Me, RuleTrigger, Settings, Stage, StageRuleItem } from '@/types';

const TIPOS: { valor: RuleTrigger; nome: string }[] = [
  { valor: 'INBOUND_KEYWORD', nome: 'Cliente escreve...' },
  { valor: 'OUTBOUND_KEYWORD', nome: 'Vendedora escreve...' },
  { valor: 'FIRST_REPLY', nome: 'Vendedora responde pela 1ª vez' },
];

/** "fechado, pix ,  paguei" → ["fechado", "pix", "paguei"] */
function separarPalavras(texto: string): string[] {
  return texto.split(',').map((p) => p.trim()).filter(Boolean);
}

export default function RegrasPage() {
  const router = useRouter();
  const [eu, setEu] = useState<Me | null>(null);
  const [regras, setRegras] = useState<StageRuleItem[]>([]);
  const [estagios, setEstagios] = useState<Stage[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [limiteAlerta, setLimiteAlerta] = useState('');

  // Nova regra
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<RuleTrigger>('INBOUND_KEYWORD');
  const [destino, setDestino] = useState('');
  const [palavras, setPalavras] = useState('');

  const carregar = useCallback(async () => {
    const [lista, listaEstagios, config] = await Promise.all([
      api<StageRuleItem[]>('/stage-rules'),
      api<Stage[]>('/stages'),
      api<Settings>('/settings'),
    ]);
    setRegras(lista);
    setEstagios(listaEstagios);
    setLimiteAlerta(String(config.responseAlertMinutes));
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

  /** Todo pedido que altera devolve a lista inteira atualizada */
  async function enviar(caminho: string, metodo: string, corpo?: unknown, mensagemOk = 'Salvo.') {
    limparAvisos();
    try {
      const lista = await api<StageRuleItem[]>(caminho, {
        method: metodo,
        body: corpo === undefined ? undefined : JSON.stringify(corpo),
      });
      setRegras(lista);
      setAviso(mensagemOk);
      return true;
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
      await carregar(); // volta a tela ao que está no banco
      return false;
    }
  }

  function salvar(
    regra: StageRuleItem,
    dados: Partial<Pick<StageRuleItem, 'name' | 'trigger' | 'toStageId' | 'keywords' | 'active'>>,
  ) {
    if (dados.name !== undefined) {
      dados.name = dados.name.trim();
      if (!dados.name || dados.name === regra.name) return;
    }
    if (dados.keywords !== undefined && dados.keywords.join(',') === regra.keywords.join(',')) return;
    void enviar(`/stage-rules/${regra.id}`, 'PATCH', dados);
  }

  function mover(indice: number, direcao: -1 | 1) {
    const vizinho = indice + direcao;
    if (vizinho < 0 || vizinho >= regras.length) return;
    const novaOrdem = [...regras];
    [novaOrdem[indice], novaOrdem[vizinho]] = [novaOrdem[vizinho], novaOrdem[indice]];
    setRegras(novaOrdem); // otimista
    void enviar('/stage-rules/reorder', 'PATCH', { ids: novaOrdem.map((r) => r.id) }, 'Ordem salva.');
  }

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    const ok = await enviar(
      '/stage-rules',
      'POST',
      { name: nome, trigger: tipo, toStageId: destino, keywords: separarPalavras(palavras) },
      'Regra criada. Ela entra no fim da lista.',
    );
    if (ok) {
      setNome('');
      setPalavras('');
    }
  }

  async function salvarLimite() {
    limparAvisos();
    try {
      const config = await api<Settings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify({ responseAlertMinutes: Number(limiteAlerta) }),
      });
      setLimiteAlerta(String(config.responseAlertMinutes));
      setAviso('Limite do alerta salvo.');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar o limite.');
    }
  }

  if (!eu) return <p className="p-8 text-slate-600">Carregando...</p>;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Regras automáticas</h1>
          <p className="text-xs text-slate-500">{eu.organization.name}</p>
        </div>
        <Link href="/pipeline" className="text-sm text-slate-700 underline hover:text-slate-900">
          ← Voltar ao pipeline
        </Link>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">
        {erro && <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>}
        {aviso && <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">{aviso}</p>}

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p className="font-medium text-slate-900">Como funciona</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>A cada mensagem, as regras são lidas <strong>de cima para baixo</strong>. A primeira que combinar move o card.</li>
            <li>O card <strong>só anda para frente</strong>. Conversas em venda ganha ou perdida não são mexidas.</li>
            <li>Maiúsculas e acentos não importam: &quot;orçamento&quot; e &quot;ORCAMENTO&quot; são a mesma palavra.</li>
            <li>Separe as palavras por vírgula. Toda mudança vale a partir da próxima mensagem.</li>
          </ul>
        </div>

        {/* Limite do alerta de "sem resposta" */}
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="text-sm text-slate-700">
            Alerta de &quot;sem resposta&quot; depois de
            <input
              type="number"
              min={1}
              max={1440}
              value={limiteAlerta}
              onChange={(e) => setLimiteAlerta(e.target.value)}
              className="mx-2 mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
            minutos
          </label>
          <button
            onClick={salvarLimite}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Salvar limite
          </button>
        </div>

        {/* Lista de regras */}
        {regras.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-slate-700">Nenhuma regra ainda.</p>
            <button
              onClick={() => void enviar('/stage-rules/padrao', 'POST', undefined, 'Regras padrão criadas.')}
              className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Criar regras padrão
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {regras.map((r, i) => (
              <li key={r.id} className={`rounded-xl border border-slate-200 bg-white p-3 ${r.active ? '' : 'opacity-60'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Ordem */}
                  <span className="w-5 text-center text-xs text-slate-500">{i + 1}</span>
                  <div className="flex flex-col">
                    <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${r.name}`}
                      className="px-1 text-slate-600 disabled:opacity-30">↑</button>
                    <button onClick={() => mover(i, 1)} disabled={i === regras.length - 1} aria-label={`Descer ${r.name}`}
                      className="px-1 text-slate-600 disabled:opacity-30">↓</button>
                  </div>

                  {/* Nome */}
                  <input
                    key={r.id + r.name}
                    defaultValue={r.name}
                    aria-label="Nome da regra"
                    onBlur={(e) => salvar(r, { name: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    className="w-44 rounded-md border border-slate-300 px-2 py-1 text-sm font-medium text-slate-900"
                  />

                  {/* Quando */}
                  <select value={r.trigger} aria-label="Quando"
                    onChange={(e) => salvar(r, { trigger: e.target.value as RuleTrigger })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900">
                    {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.nome}</option>)}
                  </select>

                  {/* Para onde */}
                  <span className="text-sm text-slate-500">→ mover para</span>
                  <select value={r.toStageId} aria-label="Mover para"
                    onChange={(e) => salvar(r, { toStageId: e.target.value })}
                    className="rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900">
                    {estagios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>

                  {/* Ligar / desligar e excluir */}
                  <div className="ml-auto flex items-center gap-2">
                    <button onClick={() => salvar(r, { active: !r.active })}
                      className={`rounded-full px-2 py-0.5 text-xs ${r.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                      {r.active ? 'Ligada' : 'Desligada'}
                    </button>
                    {excluindo === r.id ? (
                      <>
                        <button
                          onClick={() => {
                            setExcluindo(null);
                            void enviar(`/stage-rules/${r.id}`, 'DELETE', undefined, 'Regra excluída.');
                          }}
                          className="rounded-md bg-red-700 px-2 py-1 text-xs text-white"
                        >
                          Confirmar
                        </button>
                        <button onClick={() => setExcluindo(null)} className="text-xs underline">Cancelar</button>
                      </>
                    ) : (
                      <button onClick={() => setExcluindo(r.id)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                        Excluir
                      </button>
                    )}
                  </div>
                </div>

                {/* Palavras */}
                <div className="mt-2 pl-12">
                  {r.trigger === 'FIRST_REPLY' ? (
                    <p className="text-xs text-slate-500">Esta regra não usa palavras: dispara na primeira resposta da vendedora.</p>
                  ) : (
                    <input
                      key={r.id + r.keywords.join('|')}
                      defaultValue={r.keywords.join(', ')}
                      aria-label="Palavras"
                      placeholder="palavra 1, palavra 2, ..."
                      onBlur={(e) => salvar(r, { keywords: separarPalavras(e.target.value) })}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Nova regra */}
        <form onSubmit={criar} className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Nova regra</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm text-slate-700">
              Nome
              <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Pediu catálogo"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="text-sm text-slate-700">
              Quando
              <select value={tipo} onChange={(e) => setTipo(e.target.value as RuleTrigger)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
                {TIPOS.map((t) => <option key={t.valor} value={t.valor}>{t.nome}</option>)}
              </select>
            </label>
            <label className="text-sm text-slate-700">
              Mover para
              <select required value={destino} onChange={(e) => setDestino(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
                <option value="">Escolha...</option>
                {estagios.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          {tipo !== 'FIRST_REPLY' && (
            <label className="mt-3 block text-sm text-slate-700">
              Palavras (separadas por vírgula)
              <input value={palavras} onChange={(e) => setPalavras(e.target.value)} placeholder="catálogo, fotos, modelos"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
          )}
          <button type="submit" className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Criar regra
          </button>
        </form>
      </main>
    </div>
  );
}
