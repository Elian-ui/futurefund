import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useAuthStore } from '@/stores/auth-store'
// import { AppTitle } from './app-title'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'
import { TeamSwitcher } from './team-switcher'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const admin = useAuthStore((state) => state.auth.user)
  const roles = admin?.role ?? []
  const isSupportOnly =
    roles.includes('support') &&
    !roles.includes('admin') &&
    !roles.includes('superadmin')
  const navGroups = isSupportOnly
    ? sidebarData.navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => item.url === '/support'),
        }))
        .filter((group) => group.items.length > 0)
    : sidebarData.navGroups
  const user = {
    name: admin?.name ?? 'FutureFund Admin',
    email: admin?.email ?? 'ops@futurefund.local',
    avatar: sidebarData.user.avatar,
  }

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
