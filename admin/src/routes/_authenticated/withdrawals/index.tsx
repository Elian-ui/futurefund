import { createFileRoute } from '@tanstack/react-router'
import { WithdrawalsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/withdrawals/')({
  component: WithdrawalsPage,
})
