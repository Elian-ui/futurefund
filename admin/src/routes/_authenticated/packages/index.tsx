import { createFileRoute } from '@tanstack/react-router'
import { PackagesPage } from '@/features/futurefund-admin/pages'

export const Route = createFileRoute('/_authenticated/packages/')({
  component: PackagesPage,
})
