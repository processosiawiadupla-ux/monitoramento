'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken } from '@/lib/api';

// O formato da resposta do POST /auth/login (o mesmo que você viu no requests.http)
type RespostaLogin = {
  accessToken: string;
  user: { id: string; name: string; email: string; role: string };
};

export default function LoginPage() {
  const router = useRouter(); // para trocar de página depois do login

  // A "memória" da tela
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Roda quando o formulário é enviado
  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault(); // impede o navegador de recarregar a página
    setErro('');
    setCarregando(true);

    try {
      const resposta = await api<RespostaLogin>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password: senha }),
      });
      setToken(resposta.accessToken); // guarda o crachá
      router.push('/pipeline');       // vai para a tela do pipeline
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form onSubmit={entrar} className="w-full max-w-sm bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">WiaPipe</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">Entre para ver o seu pipeline de vendas</p>

        <label htmlFor="email" className="block text-sm font-medium text-slate-700">E-mail</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />

        <label htmlFor="senha" className="block text-sm font-medium text-slate-700">Senha</label>
        <input
          id="senha"
          type="password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-1 mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        />

        {erro && (
          <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800 disabled:opacity-60"
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}