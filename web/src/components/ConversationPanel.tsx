import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatBRL, formatDateTime, formatPhone } from '@/lib/format';
import type { ConversationDetail, Stage, StageChangeItem } from '@/types';

type Props = {
  conversaId: string;
  stages: Stage[];
  onFechar: () => void;
  onAtualizada: (conversa: ConversationDetail) => void; // avisa a página que algo mudou
};

export function ConversationPanel({ conversaId, stages, onFechar, onAtualizada }: Props) {
  const [conversa, setConversa] = useState<ConversationDetail | null>(null);
  const [historico, setHistorico] = useState<StageChangeItem[]>([]);
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const fimDasMensagens = useRef<HTMLDivElement>(null);

  // Busca a conversa e o histórico sempre que abrir uma conversa diferente
  useEffect(() => {
    setConversa(null);
    setErro('');
    Promise.all([
      api<ConversationDetail>(`/conversations/${conversaId}`),
      api<StageChangeItem[]>(`/conversations/${conversaId}/history`),
    ])
      .then(([detalhe, hist]) => {
        setConversa(detalhe);
        setHistorico(hist);
        setValor(detalhe.estimatedValue ?? '');
      })
      .catch((e) => setErro(e instanceof Error ? e.message : 'Não foi possível abrir a conversa.'));
  }, [conversaId]);

  // Rola as mensagens até a mais recente
  useEffect(() => {
    fimDasMensagens.current?.scrollIntoView();
  }, [conversa]);

  // Fecha com a tecla Esc
  useEffect(() => {
    function aoApertarTecla(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    document.addEventListener('keydown', aoApertarTecla);
    return () => document.removeEventListener('keydown', aoApertarTecla);
  }, [onFechar]);

  async function mudarEstagio(stageId: string) {
    setErro('');
    try {
      const atualizada = await api<ConversationDetail>(`/conversations/${conversaId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stageId }),
      });
      setConversa(atualizada);
      onAtualizada(atualizada); // o card no quadro muda de coluna
      setHistorico(await api<StageChangeItem[]>(`/conversations/${conversaId}/history`));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mudar o estágio.');
    }
  }

  async function salvarValor() {
    const texto = valor.trim().replace(',', '.'); // aceita "1500,50" e "1500.50"
    const numero = texto === '' ? null : Number(texto);
    if (numero !== null && (Number.isNaN(numero) || numero < 0)) {
      setErro('Digite um valor válido, por exemplo 1500 ou 1500,50.');
      return;
    }
    setErro('');
    setSalvando(true);
    try {
      const atualizada = await api<ConversationDetail>(`/conversations/${conversaId}`, {
        method: 'PATCH',
        body: JSON.stringify({ estimatedValue: numero }),
      });
      setConversa(atualizada);
      onAtualizada(atualizada); // o valor do card e o total da coluna mudam
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível salvar o valor.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      {/* Fundo escuro: clicar fora fecha o painel */}
      <button aria-label="Fechar painel" onClick={onFechar} className="fixed inset-0 z-20 cursor-default bg-slate-900/20" />

      <aside
        aria-label="Conversa"
        className="fixed inset-y-0 right-0 z-30 flex w-[28rem] max-w-full flex-col border-l border-slate-200 bg-white shadow-xl"
      >
        {!conversa ? (
          <div className="p-6 text-sm text-slate-600">{erro || 'Carregando conversa...'}</div>
        ) : (
          <>
            {/* Cabeçalho */}
            <header className="border-b border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">{conversa.contact.name ?? 'Sem nome'}</h2>
                  <p className="text-sm text-slate-600">{formatPhone(conversa.contact.phone)}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {conversa.whatsappNumber?.label ?? 'Número não identificado'} ·{' '}
                    {conversa.assignedTo?.name ?? 'Sem vendedor'}
                  </p>
                </div>
                <button
                  onClick={onFechar}
                  aria-label="Fechar"
                  className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
                >
                  ×
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="estagio" className="block text-xs font-medium text-slate-700">Estágio</label>
                  <select
                    id="estagio"
                    value={conversa.stage.id}
                    onChange={(e) => mudarEstagio(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900"
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="valor" className="block text-xs font-medium text-slate-700">Valor estimado (R$)</label>
                  <div className="mt-1 flex gap-1">
                    <input
                      id="valor"
                      inputMode="decimal"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      placeholder="0"
                      className="w-full min-w-0 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-900"
                    />
                    <button
                      onClick={salvarValor}
                      disabled={salvando}
                      className="rounded-lg border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                    >
                      {salvando ? '...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </div>

              <a
                href={`https://web.whatsapp.com/send?phone=${conversa.contact.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 flex items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Abrir no WhatsApp ↗
              </a>

              {erro && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {erro}
                </p>
              )}
            </header>

            {/* Mensagens, no estilo do WhatsApp */}
            <div className="flex-1 space-y-2 overflow-y-auto bg-[#EFEAE2] p-4">
              {conversa.messages.length === 0 && (
                <p className="text-center text-sm text-slate-600">Nenhuma mensagem ainda.</p>
              )}
              {conversa.messages.map((m) => {
                const doCliente = m.direction === 'INBOUND';
                return (
                  <div key={m.id} className={`flex ${doCliente ? 'justify-start' : 'justify-end'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm text-slate-900 shadow-sm ${
                        doCliente ? 'bg-white' : 'bg-[#D9FDD3]'
                      }`}
                    >
                      {!doCliente && (
                        <p className="mb-0.5 text-xs font-semibold text-green-800">
                          {m.author === 'BOT' ? 'Resposta automática' : (m.sentBy?.name ?? 'Enviada pelo app')}
                        </p>
                      )}
                      <p className="whitespace-pre-line">{m.body}</p>
                      <p className="mt-1 text-right text-[11px] text-slate-500">{formatDateTime(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={fimDasMensagens} />
            </div>

            {/* Histórico de estágios */}
            <details className="border-t border-slate-200 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                Histórico de estágios ({historico.length})
              </summary>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-slate-700">
                {historico.map((h) => (
                  <li key={h.id}>
                    <span className="text-slate-500">{formatDateTime(h.createdAt)}</span> ·{' '}
                    {h.fromStage ? `${h.fromStage.name} → ` : 'Criada em '}
                    <strong>{h.toStage.name}</strong> ·{' '}
                    {h.byAi ? 'automático' : (h.changedBy?.name ?? 'sistema')}
                  </li>
                ))}
              </ul>
            </details>

            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
              Valor atual: {formatBRL(conversa.estimatedValue)}
            </p>
          </>
        )}
      </aside>
    </>
  );
}
