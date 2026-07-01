import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      id='futurefund-admin-logo'
      viewBox='0 0 64 64'
      xmlns='http://www.w3.org/2000/svg'
      height='64'
      width='64'
      fill='none'
      className={cn('size-6', className)}
      {...props}
    >
      <title>FutureFund Admin</title>
      <rect width='64' height='64' rx='16' fill='#04100B' />
      <path
        d='M16 44L27 33L35 41L49 20'
        stroke='#16C784'
        strokeWidth='6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M38 20H49V31'
        stroke='#F5B84B'
        strokeWidth='6'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <path
        d='M15 49H51'
        stroke='#EAFBF2'
        strokeWidth='4'
        strokeLinecap='round'
        opacity='.82'
      />
    </svg>
  )
}
