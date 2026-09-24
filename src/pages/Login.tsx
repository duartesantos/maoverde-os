import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aEntrar, setAEntrar] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setAEntrar(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setAEntrar(false)
    if (error) {
      // Mensagens comuns do Supabase, traduzidas; caso contrário, a original.
      const m = error.message.toLowerCase()
      if (m.includes('email not confirmed'))
        setErro('Email por confirmar. Confirma o utilizador no Supabase (ou ativa Auto Confirm).')
      else if (m.includes('invalid login credentials'))
        setErro('Email ou palavra-passe incorretos.')
      else setErro(error.message)
      return
    }
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Painel lateral */}
      <div className="flex flex-col justify-between bg-ink p-8 text-[#efefec] lg:w-1/2 lg:p-12">
        <div>
          <div className="text-lg font-semibold">Jardins d'Óbidos</div>
          <div className="text-[12.5px] text-[#9a9a92]">Sistema de Gestão</div>
        </div>
        <div className="hidden max-w-sm lg:block">
          <h2 className="text-2xl font-semibold leading-snug">
            A operação da equipa, num só sítio.
          </h2>
          <p className="mt-3.5 text-[13.5px] leading-relaxed text-[#a3a39a]">
            Planeamento, jardins, manutenções e faturação — organizados para a
            gestão e para a equipa no terreno.
          </p>
        </div>
        <div className="text-[11.5px] text-[#77776f]">
          © 2026 Jardins d'Óbidos · Óbidos, Leiria
        </div>
      </div>

      {/* Formulário */}
      <div className="flex flex-1 items-center justify-center bg-surface p-6">
        <form onSubmit={entrar} className="w-full max-w-[340px]">
          <h1 className="text-xl font-semibold">Entrar</h1>
          <p className="mb-6 mt-1.5 text-[13px] text-muted">
            Acede com a tua conta de colaborador.
          </p>

          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@jardinsobidos.pt"
            className="mb-4 h-[42px] w-full rounded-lg border border-line bg-[#fcfcfb] px-3 text-sm outline-none focus:border-ink"
          />

          <label className="mb-1.5 block text-[12.5px] font-medium text-ink-soft">
            Palavra-passe
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••"
            className="mb-2 h-[42px] w-full rounded-lg border border-line bg-[#fcfcfb] px-3 text-sm outline-none focus:border-ink"
          />

          {erro && <p className="mb-2 text-[12.5px] text-atr">{erro}</p>}

          <button
            type="submit"
            disabled={aEntrar}
            className="mt-2 h-11 w-full rounded-lg bg-ink text-sm font-medium text-white disabled:opacity-60"
          >
            {aEntrar ? 'A entrar…' : 'Entrar'}
          </button>

          <p className="mt-4 text-[11.5px] leading-relaxed text-faint">
            As contas são criadas pela gerência. Se não tens acesso, fala com o
            administrador.
          </p>
        </form>
      </div>
    </div>
  )
}
