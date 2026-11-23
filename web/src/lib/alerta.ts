import type { ConversationSummary } from '@/types';

export function minutosAguardando(c: ConversationSummary, agora: number): number | null {
  if (!c.lastInboundAt) return null; // o cliente nunca escreveu
  const cliente = new Date(c.lastInboundAt).getTime();
  const vendedora = c.lastOutboundAt ? new Date(c.lastOutboundAt).getTime() : 0;
  if (vendedora >= cliente) return null; // a vendedora já respondeu
  return Math.max(0, Math.floor((agora - cliente) / 60000));
}

export function formatarEspera(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  if (minutos < 1440) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  const dias = Math.floor(minutos / 1440);
  return dias === 1 ? '1 dia' : `${dias} dias`;
}
