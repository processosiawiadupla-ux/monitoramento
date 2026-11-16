const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';
const TOKEN_KEY = 'wiapipe.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  const headers = new Headers(opcoes.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const resposta = await fetch(`${API_URL}${caminho}`, { ...opcoes, headers });

  const dados = await resposta.json().catch(() => null);

 
  if (!resposta.ok) {
    const mensagem = Array.isArray(dados?.message) ? dados.message[0] : dados?.message;
    throw new Error(mensagem ?? 'Não foi possível falar com o servidor.');
  }
  return dados as T;
}

