import { Link } from 'react-router-dom'
import { Lock, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function FeatureDisabled() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Card className="max-w-md w-full rounded-2xl border-line bg-surface/50 backdrop-blur-sm shadow-raised text-center overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-6">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Access Restricted
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            This module has been temporarily disabled by the system administrator. Please contact support if you believe this is an error.
          </p>
          <div className="mt-8 w-full">
            <Button asChild className="w-full rounded-xl">
              <Link to="/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
