import { Logo } from '@/assets/logo'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='bg-muted/30 container grid h-svh max-w-none items-center justify-center'>
      <div className='mx-auto flex w-full max-w-md flex-col justify-center space-y-4 py-8 sm:p-8'>
        <div className='mb-2 flex flex-col items-center justify-center gap-3 text-center'>
          <div className='bg-primary/10 text-primary rounded-xl border p-3'>
            <Logo className='size-7' />
          </div>
          <div>
            <h1 className='text-2xl font-semibold tracking-tight'>
              FutureFund Admin
            </h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              Operations access for packages, wallet limits, and RBAC controls.
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
