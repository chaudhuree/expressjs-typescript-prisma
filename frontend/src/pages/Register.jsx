import { useState } from 'react'
import { register as apiRegister } from '../api/auth'
import { useNavigate, Link } from 'react-router-dom'

export default function Register(){
  const nav = useNavigate()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      await apiRegister(form)
      nav('/')
    }catch(err){ setError(err.message || 'Registration failed') }
    finally{ setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white shadow rounded p-6 space-y-4">
        <h1 className="text-xl font-semibold">Create account</h1>
        {error ? <div className="text-red-600 text-sm">{error}</div> : null}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm">First name</label>
            <input name="firstName" value={form.firstName} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="text-sm">Last name</label>
            <input name="lastName" value={form.lastName} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" required />
          </div>
        </div>
        <div>
          <label className="text-sm">Email</label>
          <input name="email" type="email" value={form.email} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="text-sm">Password</label>
          <input name="password" type="password" value={form.password} onChange={onChange} className="mt-1 w-full border rounded px-3 py-2" required />
        </div>
        <button disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50">
          {loading ? 'Creating...' : 'Register'}
        </button>
        <p className="text-sm">Have an account? <Link to="/login" className="text-blue-600">Login</Link></p>
      </form>
    </div>
  )
}
