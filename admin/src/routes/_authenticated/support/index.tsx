import { createFileRoute } from '@tanstack/react-router'
import { SupportPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/support/')({
  component: SupportPage,
})
