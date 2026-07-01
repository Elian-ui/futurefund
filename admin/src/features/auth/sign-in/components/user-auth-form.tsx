import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email.' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password.')
    .min(7, 'Password must be at least 7 characters long.'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(data: z.infer<typeof formSchema>) {
    setIsLoading(true)

    toast.promise(
      api.post('/auth/login', {
        email: data.email,
        password: data.password,
      }),
      {
      loading: 'Signing in...',
      success: (response) => {
        setIsLoading(false)
        const roles = response.data.user.roles ?? []

        if (
          !roles.includes('support') &&
          !roles.includes('admin') &&
          !roles.includes('superadmin')
        ) {
          auth.reset()
          throw new Error('This account does not have operations access.')
        }

        auth.setUser({
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
          role: roles,
          exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
        })
        auth.setAccessToken(response.data.access_token)

        const isSupportOnly =
          roles.includes('support') &&
          !roles.includes('admin') &&
          !roles.includes('superadmin')
        const targetPath = isSupportOnly ? '/support' : redirectTo || '/'
        navigate({ to: targetPath, replace: true })

        return `Welcome back, ${response.data.user.name}!`
      },
      error: (error) =>
        error?.message === 'This account does not have operations access.'
          ? error.message
          : error?.response?.data?.message || 'Unable to sign in.',
      finally: () => setIsLoading(false),
    }
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder='name@example.com' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem className='relative'>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput placeholder='********' {...field} />
              </FormControl>
              <FormMessage />
              <Link
                to='/forgot-password'
                className='absolute inset-e-0 -top-0.5 text-sm font-medium text-muted-foreground hover:opacity-75'
              >
                Forgot password?
              </Link>
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Sign in
        </Button>

        <p className='text-muted-foreground text-center text-xs'>
          For authorized FutureFund operations team members only.
        </p>
      </form>
    </Form>
  )
}
