import {
  Banknote,
  BriefcaseBusiness,
  ClipboardList,
  CreditCard,
  LifeBuoy,
  Package,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Logo } from '@/assets/logo'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'FutureFund Admin',
    email: 'ops@futurefund.local',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'FutureFund',
      logo: Logo,
      plan: 'Operations',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: TrendingUp,
        },
        {
          title: 'Investors',
          url: '/investors',
          icon: Users,
        },
        {
          title: 'Packages',
          url: '/packages',
          icon: Package,
        },
        {
          title: 'Investments',
          url: '/investments',
          icon: BriefcaseBusiness,
        },
      ],
    },
    {
      title: 'Money Movement',
      items: [
        {
          title: 'Transactions',
          url: '/transactions',
          icon: ClipboardList,
        },
        {
          title: 'Deposits',
          url: '/deposits',
          icon: Banknote,
        },
        {
          title: 'Withdrawals',
          url: '/withdrawals',
          icon: CreditCard,
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          title: 'Platform Settings',
          url: '/platform-settings',
          icon: Settings,
        },
        {
          title: 'Audit Logs',
          url: '/audit-logs',
          icon: ShieldCheck,
        },
        {
          title: 'Support',
          url: '/support',
          icon: LifeBuoy,
        },
      ],
    },
  ],
}
