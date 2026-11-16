export function formatBRL(valor: string | number | null): string {
  if (valor === null) return '—';
  return Number(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

// "5511987654321" -> "(11) 98765-4321"
export function formatPhone(telefone: string): string {
  const d = telefone.replace(/^55/, ''); // tira o 55 do Brasil
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

// data da última mensagem -> "há 12 min", "há 3 h", "há 2 d"
export function timeAgo(data: string): string {
  const minutos = Math.round((Date.now() - new Date(data).getTime()) / 60000);
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} d`;
}

export function formatDateTime(data: string): string {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}