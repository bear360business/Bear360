import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { BrandLogo } from '@/components/app/BrandLogo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/use-auth'

/** Super Admin login — demo auth against local accounts. */
export function SuperLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('anya@bear360.app')
  const [password, setPassword] = useState('demo1234')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    const result = await login(email.trim().toLowerCase(), password, 'super')
    if (!result.ok) {
      setSubmitting(false)
      toast.error(result.error)
      return
    }
    setTimeout(() => navigate('/super/dashboard'), 600)
  }

  return (
    <div className="force-light auth-shell flex min-h-screen w-full items-center justify-center bg-surface-page px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center gap-3">
          <BrandLogo size={56} className="rounded-xl shadow-card" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Bear 360 · Super Admin
          </p>
        </div>
        <Card className="rounded-card border border-line bg-surface shadow-card">
          <CardContent className="p-8">
            <h2 className="font-display text-2xl font-bold text-foreground">
              Sign in to Bear 360
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform administration · password{' '}
              <span className="font-medium text-foreground">demo1234</span>
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-line bg-white text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-line bg-white pr-10 text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full rounded-full font-semibold"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <p className="mt-6 text-center">
              <Link
                to="/forgot-password?from=super"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Forgot password?
              </Link>
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center">
          <Link
            to="/"
            className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            ← Home
          </Link>
        </p>
      </div>
    </div>
  )
}
