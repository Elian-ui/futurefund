import { createFileRoute } from '@tanstack/react-router'
import { TransactionsPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: TransactionsPage,
})
