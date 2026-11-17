'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearToken } from '@/lib/api';
import type { Me, Role, UserSummary } from '@/types';

const PAPEIS: { valor: Role; nome: string }[] = [
  { valor: 'VENDEDOR', nome: 'Vendedor' },
  { valor: 'GESTOR', nome: 'Gestor' },
  { valor: 'ADMIN', nome: 'Administrador' },
];

export default function UsuariosPage() {
  const router = useRouter();
  const [eu, setEu] = useState<Me | null>(null);
  const [usuarios, setUsuarios] = useState<UserSummary[]>([]);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  // Formulário de novo usuário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [papel, setPapel] = useState<Role>('VENDEDOR');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setUsuarios(await api<UserSummary[]>('/users'));
  }, []);

  // Ao abrir: quem sou eu? Vendedor não entra aqui.
  useEffect(() => {
    api<Me>('/auth/me')
      .then(async (me) => {
        if (me.role === 'VENDEDOR') {
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

  async function criar(evento: FormEvent) {
    evento.preventDefault();
    setErro('');
    setAviso('');
    setSalvando(true);
    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({ name: nome, email, password: senha, role: papel }),
      });
      setNome('');
      setEmail('');
      setSenha('');
      setPapel('VENDEDOR');
      setAviso('Usuário criado.');
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível criar o usuário.');
    } finally {
      setSalvando(false);
    }
  }

  async function alterar(usuario: UserSummary, dados: { role?: Role; active?: boolean }) {
    setErro('');
    setAviso('');
    try {
      const atualizado = await api<UserSummary>(`/users/${usuario.id}`, {
        method: 'PATCH',
        body: JSON.stringify(dados),
      });
      setUsuarios((lista) => lista.map((u) => (u.id === atualizado.id ? atualizado : u)));
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    }
  }

  if (!eu) return <p className="p-8 text-slate-600">Carregando...</p>;

  const souAdmin = eu.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Usuários</h1>
          <p className="text-xs text-slate-500">{eu.organization.name}</p>
        </div>
        <Link href="/pipeline" className="text-sm text-slate-700 underline hover:text-slate-900">
          ← Voltar ao pipeline
        </Link>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 p-6">
        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
        {aviso && (
          <p role="status" className="rounded-lg bg-green-50 px-4 py-2 text-sm text-green-800">
            {aviso}
          </p>
        )}

        {/* Novo usuário */}
        <form onSubmit={criar} className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold text-slate-900">Novo usuário</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm text-slate-700">
              Nome
              <input required value={nome} onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="text-sm text-slate-700">
              E-mail
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="text-sm text-slate-700">
              Senha inicial (mínimo 8 caracteres)
              <input required type="password" minLength={8} value={senha} onChange={(e) => setSenha(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" />
            </label>
            <label className="text-sm text-slate-700">
              Papel
              <select value={papel} onChange={(e) => setPapel(e.target.value as Role)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900">
                {PAPEIS.filter((p) => p.valor !== 'ADMIN' || souAdmin).map((p) => (
                  <option key={p.valor} value={p.valor}>{p.nome}</option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit" disabled={salvando}
            className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50">
            {salvando ? 'Salvando...' : 'Criar usuário'}
          </button>
        </form>

        {/* Lista */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">E-mail</th>
                <th className="px-4 py-2 font-medium">Papel</th>
                <th className="px-4 py-2 font-medium">Situação</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => {
                const ehEu = u.id === eu.id;
                const bloqueado = ehEu || (!souAdmin && u.role === 'ADMIN');
                return (
                  <tr key={u.id} className={`border-t border-slate-100 ${u.active ? '' : 'text-slate-400'}`}>
                    <td className="px-4 py-2 font-medium">
                      {u.name} {ehEu && <span className="text-xs text-slate-500">(você)</span>}
                    </td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">
                      <select value={u.role} disabled={bloqueado}
                        onChange={(e) => alterar(u, { role: e.target.value as Role })}
                        className="rounded-md border border-slate-300 px-2 py-1 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500">
                        {PAPEIS.filter((p) => p.valor !== 'ADMIN' || souAdmin || u.role === 'ADMIN').map((p) => (
                          <option key={p.valor} value={p.valor}>{p.nome}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {u.active ? 'Ativo' : 'Desativado'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!bloqueado && (
                        <button onClick={() => alterar(u, { active: !u.active })}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100">
                          {u.active ? 'Desativar' : 'Reativar'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}