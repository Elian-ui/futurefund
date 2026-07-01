import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  Activity,
  Banknote,
  Boxes,
  ClipboardList,
  CreditCard,
  Pencil,
  Trash2,
  Download,
  Landmark,
  Loader2,
  PackagePlus,
  Play,
  Save,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { api } from '@/lib/api'

type Cycle = 'daily' | 'weekly' | 'monthly'

interface UserRecord {
  _id: string
  name: string
  email: string
  phoneNumber?: string
  roles?: string[]
  balance: number
  totalInvested: number
  totalEarned: number
  emailVerified?: boolean
  deletedAt?: string
  deletionReason?: string
  createdAt?: string
}

interface UserDraft {
  name: string
  email: string
  phoneNumber: string
  password: string
  balance: number
  totalInvested: number
  totalEarned: number
  emailVerified: boolean
  roles: string[]
}

interface PackageRecord {
  id: string
  name: string
  cycle: Cycle
  rate: number
  duration: number
  minInvestment: number
  maxInvestment: number
  description: string
  isActive: boolean
}

interface TransactionRecord {
  _id: string
  userId?: OwnerRecord | string
  type: string
  status?: 'pending' | 'approved' | 'rejected' | 'completed'
  amount: number
  description: string
  method?: string
  destination?: string
  reference?: string
  externalPaymentId?: string
  externalPaymentProvider?: string
  externalPaymentStatus?: string
  externalProviderReference?: string
  externalPaymentFee?: number
  externalFailureReason?: string
  reviewNote?: string
  timestamp: string
}

interface AuditLogRecord {
  _id: string
  actorEmail: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface InvestmentRecord {
  _id: string
  userId?: OwnerRecord | string
  packageName: string
  cycle: Cycle
  rate: number
  duration: number
  durationSpent: number
  amount: number
  accumulatedYield: number
  status: string
  createdAt?: string
}

interface OwnerRecord {
  _id: string
  name: string
  email: string
}

interface PlatformSettings {
  minDeposit: number
  maxDeposit: number
  minWithdrawal: number
  maxWithdrawal: number
  depositsEnabled: boolean
  withdrawalsEnabled: boolean
  paymentMethods: PaymentMethodRecord[]
}

interface PaymentMethodRecord {
  id: string
  label: string
  method: string
  network?: string
  address?: string
  channel?: 'crypto' | 'mobile_money'
  provider?: string
  currency?: string
  requiresPhoneNumber?: boolean
  enabled: boolean
  depositEnabled: boolean
  withdrawalEnabled: boolean
}

interface SupportMessage {
  authorId?: OwnerRecord | string
  authorRole: 'investor' | 'support' | 'admin'
  body: string
  createdAt: string
}

interface SupportTicket {
  _id: string
  userId?: (OwnerRecord & { balance?: number }) | string
  assignedTo?: OwnerRecord | string | null
  subject: string
  category: string
  status: 'open' | 'pending' | 'resolved' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  messages: SupportMessage[]
  lastActivityAt: string
  createdAt?: string
}

interface SupportSummary {
  open: number
  pending: number
  resolved: number
  urgent: number
}

interface Overview {
  metrics: {
    investors: number
    activePlans: number
    totalWalletBalance: number
    activeCapital: number
    totalEarned: number
  }
  packages: PackageRecord[]
  settings: PlatformSettings
  recentUsers: UserRecord[]
  recentTransactions: TransactionRecord[]
}

interface PayoutJobStatus {
  enabled: boolean
  activeInvestments: number
  locked: boolean
  lockedUntil?: string
  lastRunAt?: string
  lastFinishedAt?: string
  owner?: string
  serverTime: string
}

interface PayoutRunResult {
  success: boolean
  message?: string
  usersChecked?: number
  payoutsProcessed?: number
  maturedInvestments?: number
  amountPaid?: number
  principalReturned?: number
  status?: PayoutJobStatus
}

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const date = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : 'Not available'

const owner = (value?: OwnerRecord | string) => {
  if (!value || typeof value === 'string') {
    return { name: 'Unknown investor', email: 'No owner profile' }
  }

  return {
    name: value.name,
    email: value.email,
  }
}

const emptyPackage: PackageRecord = {
  id: '',
  name: '',
  cycle: 'daily',
  rate: 1,
  duration: 30,
  minInvestment: 100,
  maxInvestment: 2500,
  description: '',
  isActive: true,
}

const emptyUserDraft: UserDraft = {
  name: '',
  email: '',
  phoneNumber: '+256',
  password: '',
  balance: 0,
  totalInvested: 0,
  totalEarned: 0,
  emailVerified: true,
  roles: ['investor'],
}

function PageShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <>
      <Header>
        <Search />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main>
        <div className='mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
            <p className='text-muted-foreground text-sm'>{description}</p>
          </div>
        </div>
        {children}
      </Main>
    </>
  )
}

function LoadingState() {
  return (
    <div className='flex h-80 items-center justify-center'>
      <Loader2 className='text-muted-foreground size-8 animate-spin' />
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className='text-muted-foreground rounded-md border p-8 text-center text-sm'>
      {label}
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon: typeof Users
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{label}</CardTitle>
        <Icon className='text-muted-foreground size-4' />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>{value}</div>
      </CardContent>
    </Card>
  )
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Input
        type='number'
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  disabled,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  type?: string
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}

function UserForm({
  value,
  mode,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: UserDraft
  mode: 'create' | 'edit'
  saving: boolean
  onChange: (value: UserDraft) => void
  onSubmit: () => void
  onCancel: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create Investor' : 'Edit Investor'}</CardTitle>
        <CardDescription>
          Manage account identity, wallet figures, verification, and roles.
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 lg:grid-cols-6'>
        <TextField
          label='Name'
          value={value.name}
          onChange={(name) => onChange({ ...value, name })}
        />
        <TextField
          label='Email'
          value={value.email}
          onChange={(email) => onChange({ ...value, email })}
        />
        <TextField
          label='Phone'
          value={value.phoneNumber}
          onChange={(phoneNumber) => onChange({ ...value, phoneNumber })}
        />
        <TextField
          label={mode === 'create' ? 'Password' : 'New password'}
          type='password'
          value={value.password}
          onChange={(password) => onChange({ ...value, password })}
        />
        <NumberField
          label='Wallet Balance'
          value={value.balance}
          onChange={(balance) => onChange({ ...value, balance })}
        />
        <NumberField
          label='Total Invested'
          value={value.totalInvested}
          onChange={(totalInvested) => onChange({ ...value, totalInvested })}
        />
        <NumberField
          label='Total Earned'
          value={value.totalEarned}
          onChange={(totalEarned) => onChange({ ...value, totalEarned })}
        />
        <div className='space-y-2 lg:col-span-2'>
          <Label>Roles</Label>
          <div className='flex flex-wrap gap-2 rounded-md border p-2'>
            {['investor', 'support', 'admin', 'superadmin'].map((role) => (
              <label
                key={role}
                className='flex items-center gap-1 rounded-md border px-2 py-1 text-xs'
              >
                <input
                  type='checkbox'
                  checked={value.roles.includes(role)}
                  onChange={(event) => {
                    const roles = event.target.checked
                      ? Array.from(new Set([...value.roles, role]))
                      : value.roles.filter((item) => item !== role)
                    onChange({ ...value, roles })
                  }}
                />
                {role}
              </label>
            ))}
          </div>
        </div>
        <div className='flex items-center gap-2 pt-7'>
          <Switch
            checked={value.emailVerified}
            onCheckedChange={(emailVerified) =>
              onChange({ ...value, emailVerified })
            }
          />
          <Label>Email verified</Label>
        </div>
        <div className='flex items-center gap-2 lg:col-span-6'>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? <Loader2 className='animate-spin' /> : <Save />}
            {mode === 'create' ? 'Create investor' : 'Save investor'}
          </Button>
          <Button variant='outline' onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PackageForm({
  value,
  mode,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: PackageRecord
  mode: 'create' | 'edit'
  saving: boolean
  onChange: (value: PackageRecord) => void
  onSubmit: () => void
  onCancel?: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create Package' : 'Edit Package'}</CardTitle>
        <CardDescription>
          Configure the ROI cycle, maturity duration, and investment limits.
        </CardDescription>
      </CardHeader>
      <CardContent className='grid gap-4 lg:grid-cols-6'>
        <TextField
          label='ID'
          value={value.id}
          disabled={mode === 'edit'}
          onChange={(id) => onChange({ ...value, id })}
        />
        <TextField
          label='Name'
          value={value.name}
          onChange={(name) => onChange({ ...value, name })}
        />
        <div className='space-y-2'>
          <Label>Cycle</Label>
          <select
            value={value.cycle}
            onChange={(event) =>
              onChange({ ...value, cycle: event.target.value as Cycle })
            }
            className='border-input bg-background h-9 w-full rounded-md border px-3 text-sm'
          >
            <option value='daily'>Daily</option>
            <option value='weekly'>Weekly</option>
            <option value='monthly'>Monthly</option>
          </select>
        </div>
        <NumberField
          label='Rate %'
          value={value.rate}
          onChange={(rate) => onChange({ ...value, rate })}
        />
        <NumberField
          label='Duration'
          value={value.duration}
          onChange={(duration) => onChange({ ...value, duration })}
        />
        <NumberField
          label='Min Investment'
          value={value.minInvestment}
          onChange={(minInvestment) => onChange({ ...value, minInvestment })}
        />
        <NumberField
          label='Max Investment'
          value={value.maxInvestment}
          onChange={(maxInvestment) => onChange({ ...value, maxInvestment })}
        />
        <div className='lg:col-span-4'>
          <TextField
            label='Description'
            value={value.description}
            onChange={(description) => onChange({ ...value, description })}
          />
        </div>
        <div className='flex items-center gap-2 lg:col-span-6'>
          <Button onClick={onSubmit} disabled={saving}>
            {saving ? <Loader2 className='animate-spin' /> : <Save />}
            {mode === 'create' ? 'Create package' : 'Save package'}
          </Button>
          {onCancel && (
            <Button variant='outline' onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export function InvestorsPage() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState<UserDraft>(emptyUserDraft)
  const [editing, setEditing] = useState<UserRecord | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  async function loadUsers() {
    setLoading(true)
    try {
      const { data } = await api.get<UserRecord[]>('/admin/users', {
        params: { includeDeleted: true },
      })
      setUsers(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load investors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function startCreate() {
    setEditing(null)
    setDraft(emptyUserDraft)
    setShowCreate(true)
  }

  function startEdit(user: UserRecord) {
    setShowCreate(false)
    setEditing(user)
    setDraft({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber ?? '',
      password: '',
      balance: user.balance,
      totalInvested: user.totalInvested,
      totalEarned: user.totalEarned,
      emailVerified: user.emailVerified ?? false,
      roles: user.roles?.length ? user.roles : ['investor'],
    })
  }

  function cancelForm() {
    setShowCreate(false)
    setEditing(null)
    setDraft(emptyUserDraft)
  }

  async function createUser() {
    setSaving(true)
    try {
      await api.post('/admin/users', draft)
      toast.success('Investor created')
      cancelForm()
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to create investor')
    } finally {
      setSaving(false)
    }
  }

  async function updateUser() {
    if (!editing) return
    setSaving(true)
    try {
      const { password, ...payload } = draft
      await api.patch(`/admin/users/${editing._id}`, {
        ...payload,
        password: password.trim() || undefined,
      })
      toast.success('Investor updated')
      cancelForm()
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update investor')
    } finally {
      setSaving(false)
    }
  }

  async function updateRoles(user: UserRecord, role: string, checked: boolean) {
    const current = user.roles ?? []
    const roles = checked
      ? Array.from(new Set([...current, role]))
      : current.filter((item) => item !== role)

    try {
      await api.patch(`/admin/users/${user._id}/roles`, { roles })
      toast.success(`Roles updated for ${user.name}`)
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update roles')
    }
  }

  async function softDeleteUser(user: UserRecord) {
    if (!window.confirm(`Soft delete ${user.name}?`)) return

    try {
      await api.delete(`/admin/users/${user._id}`, {
        data: { reason: 'Deleted from admin investors screen' },
      })
      toast.success('Investor soft deleted')
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to delete investor')
    }
  }

  async function restoreUser(user: UserRecord) {
    try {
      await api.post(`/admin/users/${user._id}/restore`)
      toast.success('Investor restored')
      await loadUsers()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to restore investor')
    }
  }

  return (
    <PageShell
      title='Investors'
      description='Create, edit, soft delete, restore, and review investor accounts.'
    >
      <div className='mb-4 flex justify-end'>
        <Button onClick={startCreate}>
          <UserPlus />
          Create investor
        </Button>
      </div>

      {(showCreate || editing) && (
        <div className='mb-6'>
          <UserForm
            value={draft}
            mode={editing ? 'edit' : 'create'}
            saving={saving}
            onChange={setDraft}
            onSubmit={editing ? updateUser : createUser}
            onCancel={cancelForm}
          />
        </div>
      )}

      {loading ? (
        <LoadingState />
      ) : users.length === 0 ? (
        <EmptyState label='No investor accounts found.' />
      ) : (
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Invested</TableHead>
                  <TableHead>Earned</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div>
                        <p className='font-semibold'>{user.name}</p>
                        <p className='text-muted-foreground text-xs'>{user.email}</p>
                        {user.phoneNumber && (
                          <p className='text-muted-foreground text-xs'>
                            {user.phoneNumber}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{money.format(user.balance)}</TableCell>
                    <TableCell>{money.format(user.totalInvested)}</TableCell>
                    <TableCell>{money.format(user.totalEarned)}</TableCell>
                    <TableCell>
                      <div className='flex min-w-96 flex-wrap gap-2'>
                        {['investor', 'support', 'admin', 'superadmin'].map(
                          (role) => (
                            <label
                              key={role}
                              className='flex items-center gap-1 rounded-md border px-2 py-1 text-xs'
                            >
                              <input
                                type='checkbox'
                                checked={(user.roles ?? []).includes(role)}
                                onChange={(event) =>
                                  updateRoles(user, role, event.target.checked)
                                }
                              />
                              {role}
                            </label>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.deletedAt ? (
                        <div className='space-y-1'>
                          <Badge variant='destructive'>Deleted</Badge>
                          {user.deletionReason && (
                            <p className='text-muted-foreground max-w-48 text-xs'>
                              {user.deletionReason}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant='default'>Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className='flex justify-end gap-2'>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => startEdit(user)}
                        >
                          <Pencil />
                          Edit
                        </Button>
                        {user.deletedAt ? (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => restoreUser(user)}
                          >
                            <ShieldCheck />
                            Restore
                          </Button>
                        ) : (
                          <Button
                            variant='destructive'
                            size='sm'
                            onClick={() => softDeleteUser(user)}
                          >
                            <Trash2 />
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

export function PackagesPage() {
  const [packages, setPackages] = useState<PackageRecord[]>([])
  const [draft, setDraft] = useState<PackageRecord>(emptyPackage)
  const [editing, setEditing] = useState<PackageRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const { data } = await api.get<PackageRecord[]>('/admin/packages')
      setPackages(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load packages')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function toggle(pkg: PackageRecord) {
    try {
      await api.patch(`/admin/packages/${pkg.id}`, { isActive: !pkg.isActive })
      toast.success(`${pkg.name} ${pkg.isActive ? 'disabled' : 'enabled'}`)
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update package')
    }
  }

  async function createPackage() {
    setSaving(true)
    try {
      await api.post('/admin/packages', draft)
      toast.success('Package created')
      setDraft(emptyPackage)
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to create package')
    } finally {
      setSaving(false)
    }
  }

  async function updatePackage() {
    if (!editing) return
    setSaving(true)
    try {
      await api.patch(`/admin/packages/${editing.id}`, editing)
      toast.success('Package updated')
      setEditing(null)
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update package')
    } finally {
      setSaving(false)
    }
  }

  async function deletePackage(pkg: PackageRecord) {
    if (!confirm(`Delete ${pkg.name}? This removes it from the package catalog.`)) {
      return
    }

    try {
      await api.delete(`/admin/packages/${pkg.id}`)
      toast.success('Package deleted')
      if (editing?.id === pkg.id) setEditing(null)
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to delete package')
    }
  }

  return (
    <PageShell
      title='Packages'
      description='Manage investment packages shown in the customer app.'
    >
      {loading ? (
        <LoadingState />
      ) : (
        <div className='space-y-5'>
          <PackageForm
            mode={editing ? 'edit' : 'create'}
            value={editing ?? draft}
            saving={saving}
            onChange={(value) => (editing ? setEditing(value) : setDraft(value))}
            onSubmit={editing ? updatePackage : createPackage}
            onCancel={editing ? () => setEditing(null) : undefined}
          />

          <Card>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Package</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Limits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className='max-w-md'>
                          <p className='font-semibold'>{pkg.name}</p>
                          <p className='text-muted-foreground truncate text-xs'>
                            {pkg.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className='capitalize'>{pkg.cycle}</TableCell>
                      <TableCell>{pkg.rate}%</TableCell>
                      <TableCell>{pkg.duration}</TableCell>
                      <TableCell>
                        {money.format(pkg.minInvestment)} -{' '}
                        {money.format(pkg.maxInvestment)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                          {pkg.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => setEditing(pkg)}
                          >
                            <Pencil />
                            Edit
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => toggle(pkg)}
                          >
                            {pkg.isActive ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size='sm'
                            variant='destructive'
                            onClick={() => deletePackage(pkg)}
                          >
                            <Trash2 />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  )
}

function TransactionsList({
  title,
  description,
  endpoint,
  empty,
}: {
  title: string
  description: string
  endpoint: string
  empty: string
}) {
  const [rows, setRows] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState('')

  const loadRows = async () => {
    setLoading(true)
    try {
      const { data } = await api
      .get<TransactionRecord[]>(endpoint)
      setRows(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || `Unable to load ${title}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRows()
  }, [endpoint, title])

  const reviewTransaction = async (
    tx: TransactionRecord,
    decision: 'approve' | 'reject'
  ) => {
    const note =
      decision === 'reject'
        ? window.prompt('Reason for rejection?') || 'Rejected by admin'
        : window.prompt('Approval note (optional)') || undefined

    setReviewing(tx._id)
    try {
      await api.post(`/admin/transactions/${tx._id}/${decision}`, { note })
      toast.success(`Transaction ${decision === 'approve' ? 'approved' : 'rejected'}`)
      await loadRows()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to review transaction')
    } finally {
      setReviewing('')
    }
  }

  return (
    <PageShell title={title} description={description}>
      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState label={empty} />
      ) : (
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((tx) => {
                  const txOwner = owner(tx.userId)
                  const autoPolled = Boolean(tx.externalPaymentId && tx.externalPaymentProvider)
                  return (
                    <TableRow key={tx._id}>
                      <TableCell>
                        <div>
                          <p className='font-semibold'>{txOwner.name}</p>
                          <p className='text-muted-foreground text-xs'>
                            {txOwner.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className='font-medium'>{tx.description}</TableCell>
                      <TableCell>
                        <Badge variant='secondary'>{tx.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className='space-y-1'>
                          <Badge
                            variant={
                              tx.status === 'pending'
                                ? 'default'
                                : tx.status === 'rejected'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {tx.status ?? 'completed'}
                          </Badge>
                          {(tx.method || tx.reference) && (
                            <p className='text-muted-foreground text-xs'>
                              {[tx.method, tx.reference].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {autoPolled && (
                            <p className='text-muted-foreground text-xs'>
                              Auto polling {tx.externalPaymentProvider}
                              {tx.externalPaymentStatus ? ` · ${tx.externalPaymentStatus}` : ''}
                            </p>
                          )}
                          {tx.externalProviderReference && (
                            <p className='text-muted-foreground text-xs'>
                              Provider ref: {tx.externalProviderReference}
                            </p>
                          )}
                          {tx.externalFailureReason && (
                            <p className='text-destructive max-w-md text-xs'>
                              {tx.externalFailureReason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{money.format(tx.amount)}</TableCell>
                      <TableCell className='text-muted-foreground'>
                        {date(tx.timestamp)}
                      </TableCell>
                      <TableCell>
                        {tx.status === 'pending' && autoPolled ? (
                          <p className='text-muted-foreground text-right text-xs'>
                            Auto polling
                          </p>
                        ) : tx.status === 'pending' &&
                          ['deposit', 'withdrawal'].includes(tx.type) ? (
                          <div className='flex justify-end gap-2'>
                            <Button
                              size='sm'
                              disabled={reviewing === tx._id}
                              onClick={() => reviewTransaction(tx, 'approve')}
                            >
                              Approve
                            </Button>
                            <Button
                              size='sm'
                              variant='destructive'
                              disabled={reviewing === tx._id}
                              onClick={() => reviewTransaction(tx, 'reject')}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <p className='text-muted-foreground text-right text-xs'>
                            Reviewed
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

export function TransactionsPage() {
  return (
    <TransactionsList
      title='Transactions'
      description='Full ledger of deposits, withdrawals, investments, ROI payouts, and maturity refunds.'
      endpoint='/admin/transactions'
      empty='No transactions found.'
    />
  )
}

export function WithdrawalsPage() {
  return (
    <TransactionsList
      title='Withdrawals'
      description='Review settlement outflows and withdrawal history.'
      endpoint='/admin/withdrawals'
      empty='No withdrawal requests found.'
    />
  )
}

export function DepositsPage() {
  return (
    <TransactionsList
      title='Deposits'
      description='Review wallet funding activity and deposit methods.'
      endpoint='/admin/deposits'
      empty='No deposits found.'
    />
  )
}

export function InvestmentsPage() {
  const [rows, setRows] = useState<InvestmentRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<InvestmentRecord[]>('/admin/investments')
      .then(({ data }) => setRows(data))
      .catch((error) =>
        toast.error(error?.response?.data?.message || 'Unable to load investments')
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageShell
      title='Investments'
      description='Monitor active and completed package contracts.'
    >
      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState label='No investments found.' />
      ) : (
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Yield</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((investment) => {
                  const investmentOwner = owner(investment.userId)
                  return (
                    <TableRow key={investment._id}>
                      <TableCell>
                        <div>
                          <p className='font-semibold'>{investmentOwner.name}</p>
                          <p className='text-muted-foreground text-xs'>
                            {investmentOwner.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className='font-semibold'>{investment.packageName}</p>
                          <p className='text-muted-foreground text-xs'>
                            {investment.rate}% {investment.cycle}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{money.format(investment.amount)}</TableCell>
                      <TableCell className='text-primary'>
                        +{money.format(investment.accumulatedYield)}
                      </TableCell>
                      <TableCell>
                        {investment.durationSpent}/{investment.duration}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            investment.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {investment.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

export function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api
      .get<PlatformSettings>('/admin/settings')
      .then(({ data }) => setSettings(data))
      .catch((error) =>
        toast.error(error?.response?.data?.message || 'Unable to load settings')
      )
  }, [])

  async function save() {
    if (!settings) return
    setSaving(true)
    try {
      const { data } = await api.patch<PlatformSettings>('/admin/settings', settings)
      setSettings(data)
      toast.success('Platform settings saved')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to save settings')
    } finally {
      setSaving(false)
    }
  }

  function updatePaymentMethod(
    id: string,
    changes: Partial<PaymentMethodRecord>
  ) {
    if (!settings) return
    setSettings({
      ...settings,
      paymentMethods: (settings.paymentMethods ?? []).map((method) =>
        method.id === id ? { ...method, ...changes } : method
      ),
    })
  }

  return (
    <PageShell
      title='Platform Settings'
      description='Configure wallet limits and platform transaction availability.'
    >
      {!settings ? (
        <LoadingState />
      ) : (
        <Card className='max-w-3xl'>
          <CardHeader>
            <CardTitle>Wallet Controls</CardTitle>
            <CardDescription>
              These values are enforced by the backend for investor deposit and
              withdrawal requests.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-5'>
            <div className='grid gap-4 sm:grid-cols-2'>
              <NumberField
                label='Minimum Deposit'
                value={settings.minDeposit}
                onChange={(minDeposit) => setSettings({ ...settings, minDeposit })}
              />
              <NumberField
                label='Maximum Deposit'
                value={settings.maxDeposit}
                onChange={(maxDeposit) => setSettings({ ...settings, maxDeposit })}
              />
              <NumberField
                label='Minimum Withdrawal'
                value={settings.minWithdrawal}
                onChange={(minWithdrawal) =>
                  setSettings({ ...settings, minWithdrawal })
                }
              />
              <NumberField
                label='Maximum Withdrawal'
                value={settings.maxWithdrawal}
                onChange={(maxWithdrawal) =>
                  setSettings({ ...settings, maxWithdrawal })
                }
              />
            </div>
            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='flex items-center justify-between rounded-md border p-3'>
                <Label>Deposits Enabled</Label>
                <Switch
                  checked={settings.depositsEnabled}
                  onCheckedChange={(depositsEnabled) =>
                    setSettings({ ...settings, depositsEnabled })
                  }
                />
              </div>
              <div className='flex items-center justify-between rounded-md border p-3'>
                <Label>Withdrawals Enabled</Label>
                <Switch
                  checked={settings.withdrawalsEnabled}
                  onCheckedChange={(withdrawalsEnabled) =>
                    setSettings({ ...settings, withdrawalsEnabled })
                  }
                />
              </div>
            </div>
            <div className='space-y-3'>
              <div>
                <h3 className='text-sm font-semibold'>Payment Methods</h3>
                <p className='text-muted-foreground text-xs'>
                  Toggle each method globally, then choose whether it can be used
                  for deposits, withdrawals, or both.
                </p>
              </div>
              <div className='rounded-md border'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Deposits</TableHead>
                      <TableHead>Withdrawals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(settings.paymentMethods ?? []).map((method) => (
                      <TableRow key={method.id}>
                        <TableCell>
                          <div>
                            <p className='font-semibold'>{method.label}</p>
                            <p className='text-muted-foreground text-xs'>
                              {method.method}
                              {method.network ? ` · ${method.network}` : ''}
                              {method.currency ? ` · ${method.currency}` : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={method.enabled}
                            onCheckedChange={(enabled) =>
                              updatePaymentMethod(method.id, { enabled })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={method.depositEnabled}
                            disabled={!method.enabled}
                            onCheckedChange={(depositEnabled) =>
                              updatePaymentMethod(method.id, { depositEnabled })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={method.withdrawalEnabled}
                            disabled={!method.enabled}
                            onCheckedChange={(withdrawalEnabled) =>
                              updatePaymentMethod(method.id, { withdrawalEnabled })
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className='animate-spin' /> : <Save />}
              Save settings
            </Button>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

export function AnalyticsPage() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [payoutStatus, setPayoutStatus] = useState<PayoutJobStatus | null>(null)
  const [runningPayouts, setRunningPayouts] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Overview>('/admin/overview'),
      api.get<PayoutJobStatus>('/admin/jobs/payouts/status'),
    ])
      .then(([overviewRes, payoutStatusRes]) => {
        setOverview(overviewRes.data)
        setPayoutStatus(payoutStatusRes.data)
      })
      .catch((error) => {
        toast.error(error?.response?.data?.message || 'Unable to load analytics')
      })
  }, [])

  const refreshPayoutStatus = async () => {
    const { data } = await api.get<PayoutJobStatus>('/admin/jobs/payouts/status')
    setPayoutStatus(data)
  }

  const runPayoutCatchup = async () => {
    setRunningPayouts(true)
    try {
      const { data } = await api.post<PayoutRunResult>('/admin/jobs/payouts/run')

      if (!data.success) {
        toast.warning(data.message || 'Payout catch-up did not run')
        if (data.status) setPayoutStatus(data.status)
        return
      }

      toast.success(
        `Processed ${data.payoutsProcessed ?? 0} payout cycle(s), paid ${money.format(
          data.amountPaid ?? 0
        )}.`
      )
      await Promise.all([
        api.get<Overview>('/admin/overview').then(({ data }) => setOverview(data)),
        refreshPayoutStatus(),
      ])
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to run payout catch-up')
    } finally {
      setRunningPayouts(false)
    }
  }

  const exposure = useMemo(() => {
    if (!overview) return 0
    return overview.metrics.activeCapital + overview.metrics.totalEarned
  }, [overview])

  const packageTotals = useMemo(() => {
    if (!overview) return { active: 0, disabled: 0, avgMonthlyRate: 0 }

    const active = overview.packages.filter((pkg) => pkg.isActive)
    const disabled = overview.packages.length - active.length
    const monthlyEquivalent = active.reduce((sum, pkg) => {
      if (pkg.cycle === 'daily') return sum + pkg.rate * 30
      if (pkg.cycle === 'weekly') return sum + pkg.rate * 4
      return sum + pkg.rate
    }, 0)

    return {
      active: active.length,
      disabled,
      avgMonthlyRate: active.length ? monthlyEquivalent / active.length : 0,
    }
  }, [overview])

  const moneyMovement = useMemo(() => {
    const totals = {
      deposits: 0,
      withdrawals: 0,
      payouts: 0,
      investments: 0,
    }

    overview?.recentTransactions.forEach((tx) => {
      if (tx.type === 'deposit') totals.deposits += tx.amount
      if (tx.type === 'withdrawal') totals.withdrawals += tx.amount
      if (tx.type === 'payout' || tx.type === 'maturity_refund') {
        totals.payouts += tx.amount
      }
      if (tx.type === 'investment') totals.investments += tx.amount
    })

    return totals
  }, [overview])

  return (
    <PageShell
      title='Dashboard'
      description='Executive view of investor growth, capital exposure, package mix, and money movement.'
    >
      {!overview ? (
        <LoadingState />
      ) : (
        <div className='space-y-6'>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-5'>
            <MetricCard
              label='Investors'
              value={overview.metrics.investors}
              icon={Users}
            />
            <MetricCard
              label='Active Plans'
              value={overview.metrics.activePlans}
              icon={Activity}
            />
            <MetricCard
              label='Wallet Balances'
              value={money.format(overview.metrics.totalWalletBalance)}
              icon={Banknote}
            />
            <MetricCard
              label='Active Capital'
              value={money.format(overview.metrics.activeCapital)}
              icon={TrendingUp}
            />
            <MetricCard
              label='ROI Exposure'
              value={money.format(exposure)}
              icon={ShieldAlert}
            />
          </div>

          <div className='grid gap-4 lg:grid-cols-3'>
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle>Capital Overview</CardTitle>
                <CardDescription>
                  Wallet funds, active package capital, and earned ROI tracked
                  from live platform records.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-5'>
                {[
                  {
                    label: 'Wallet balances',
                    value: overview.metrics.totalWalletBalance,
                    color: 'bg-blue-500',
                  },
                  {
                    label: 'Active invested capital',
                    value: overview.metrics.activeCapital,
                    color: 'bg-emerald-500',
                  },
                  {
                    label: 'Earned ROI credited',
                    value: overview.metrics.totalEarned,
                    color: 'bg-amber-500',
                  },
                ].map((item) => {
                  const max = Math.max(
                    overview.metrics.totalWalletBalance,
                    overview.metrics.activeCapital,
                    overview.metrics.totalEarned,
                    1
                  )
                  return (
                    <div key={item.label} className='space-y-2'>
                      <div className='flex items-center justify-between text-sm'>
                        <span className='text-muted-foreground'>{item.label}</span>
                        <span className='font-semibold'>{money.format(item.value)}</span>
                      </div>
                      <div className='bg-muted h-2 overflow-hidden rounded-full'>
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operating Status</CardTitle>
                <CardDescription>
                  Wallet controls and catalog health.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Deposits</span>
                  <Badge
                    variant={
                      overview.settings.depositsEnabled ? 'default' : 'secondary'
                    }
                  >
                    {overview.settings.depositsEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Withdrawals</span>
                  <Badge
                    variant={
                      overview.settings.withdrawalsEnabled
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {overview.settings.withdrawalsEnabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Active packages</span>
                  <span className='font-semibold'>{packageTotals.active}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Disabled packages</span>
                  <span className='font-semibold'>{packageTotals.disabled}</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground'>Avg monthly equivalent</span>
                  <span className='font-semibold'>
                    {packageTotals.avgMonthlyRate.toFixed(1)}%
                  </span>
                </div>
                <div className='border-t pt-4'>
                  <div className='mb-3 flex items-center justify-between'>
                    <span className='text-muted-foreground'>Payout job</span>
                    <Badge
                      variant={
                        payoutStatus?.enabled && !payoutStatus.locked
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {payoutStatus?.locked
                        ? 'Running'
                        : payoutStatus?.enabled
                          ? 'Ready'
                          : 'Disabled'}
                    </Badge>
                  </div>
                  <div className='space-y-2 text-xs'>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-muted-foreground'>Active investments</span>
                      <span className='font-medium'>
                        {payoutStatus?.activeInvestments ?? 'Not loaded'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-muted-foreground'>Last run</span>
                      <span className='font-medium'>
                        {payoutStatus?.lastRunAt
                          ? new Date(payoutStatus.lastRunAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                    <div className='flex items-center justify-between gap-3'>
                      <span className='text-muted-foreground'>Last finished</span>
                      <span className='font-medium'>
                        {payoutStatus?.lastFinishedAt
                          ? new Date(payoutStatus.lastFinishedAt).toLocaleString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                  <Button
                    className='mt-4 w-full'
                    onClick={runPayoutCatchup}
                    disabled={runningPayouts || payoutStatus?.locked}
                  >
                    {runningPayouts ? (
                      <Loader2 className='animate-spin' />
                    ) : (
                      <Play />
                    )}
                    Run payout catch-up
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-4 xl:grid-cols-4'>
            <MetricCard
              label='Recent Deposits'
              value={money.format(moneyMovement.deposits)}
              icon={Landmark}
            />
            <MetricCard
              label='Recent Withdrawals'
              value={money.format(moneyMovement.withdrawals)}
              icon={CreditCard}
            />
            <MetricCard
              label='Recent Investments'
              value={money.format(moneyMovement.investments)}
              icon={PackagePlus}
            />
            <MetricCard
              label='Recent Payouts'
              value={money.format(moneyMovement.payouts)}
              icon={ShieldCheck}
            />
          </div>

          <div className='grid gap-4 xl:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>Package Mix</CardTitle>
                <CardDescription>
                  Current customer-facing package catalog.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-0'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Package</TableHead>
                      <TableHead>Yield</TableHead>
                      <TableHead>Limits</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.packages.map((pkg) => (
                      <TableRow key={pkg.id}>
                        <TableCell>
                          <div>
                            <p className='font-semibold'>{pkg.name}</p>
                            <p className='text-muted-foreground text-xs capitalize'>
                              {pkg.cycle} cycle
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{pkg.rate}%</TableCell>
                        <TableCell>
                          {money.format(pkg.minInvestment)} -{' '}
                          {money.format(pkg.maxInvestment)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                            {pkg.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Investors</CardTitle>
                <CardDescription>
                  Latest accounts and their wallet position.
                </CardDescription>
              </CardHeader>
              <CardContent className='p-0'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investor</TableHead>
                      <TableHead>Wallet</TableHead>
                      <TableHead>Earned</TableHead>
                      <TableHead>Roles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.recentUsers.map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>
                          <div>
                            <p className='font-semibold'>{user.name}</p>
                            <p className='text-muted-foreground text-xs'>
                              {user.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{money.format(user.balance)}</TableCell>
                        <TableCell>{money.format(user.totalEarned)}</TableCell>
                        <TableCell>
                          <div className='flex flex-wrap gap-1'>
                            {(user.roles ?? []).slice(0, 2).map((role) => (
                              <Badge key={role} variant='secondary'>
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Ledger Activity</CardTitle>
              <CardDescription>
                Latest deposits, withdrawals, purchases, and ROI payouts.
              </CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.recentTransactions.map((tx) => {
                    const txOwner = owner(tx.userId)
                    return (
                      <TableRow key={tx._id}>
                        <TableCell>
                          <div>
                            <p className='font-semibold'>{txOwner.name}</p>
                            <p className='text-muted-foreground text-xs'>
                              {txOwner.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell>
                          <Badge variant='secondary'>{tx.type}</Badge>
                        </TableCell>
                        <TableCell>{money.format(tx.amount)}</TableCell>
                        <TableCell className='text-muted-foreground'>
                          {date(tx.timestamp)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  )
}

export function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .get<AuditLogRecord[]>('/admin/audit-logs')
      .then(({ data }) => setRows(data))
      .catch((error) =>
        toast.error(error?.response?.data?.message || 'Unable to load audit logs')
      )
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageShell
      title='Audit Logs'
      description='Operational event history for auth, admin settings, packages, support, and wallet reviews.'
    >
      {loading ? (
        <LoadingState />
      ) : rows.length === 0 ? (
        <EmptyState label='No audit activity found.' />
      ) : (
        <Card>
          <CardContent className='p-0'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Metadata</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className='font-medium'>{log.actorEmail}</TableCell>
                    <TableCell>
                      <Badge variant='secondary'>{log.action}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className='font-semibold'>{log.entityType}</p>
                        <p className='text-muted-foreground text-xs'>
                          {log.entityId ?? 'No entity id'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className='max-w-[280px] truncate text-xs'>
                      {JSON.stringify(log.metadata ?? {})}
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      {date(log.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  )
}

export function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [summary, setSummary] = useState<SupportSummary>({
    open: 0,
    pending: 0,
    resolved: 0,
    urgent: 0,
  })
  const [selectedId, setSelectedId] = useState('')
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const selectedTicket =
    tickets.find((ticket) => ticket._id === selectedId) ?? tickets[0]

  const loadSupport = async () => {
    setLoading(true)
    try {
      const [summaryRes, ticketsRes] = await Promise.all([
        api.get<SupportSummary>('/admin/support/summary'),
        api.get<SupportTicket[]>('/admin/support/tickets'),
      ])
      setSummary(summaryRes.data)
      setTickets(ticketsRes.data)
      if (!selectedId && ticketsRes.data[0]?._id) {
        setSelectedId(ticketsRes.data[0]._id)
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to load support')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSupport()
  }, [])

  const updateTicket = async (
    ticketId: string,
    input: Partial<Pick<SupportTicket, 'status' | 'priority'>>
  ) => {
    setSaving(true)
    try {
      await api.patch(`/admin/support/tickets/${ticketId}`, input)
      toast.success('Ticket updated')
      await loadSupport()
      setSelectedId(ticketId)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to update ticket')
    } finally {
      setSaving(false)
    }
  }

  const assignToMe = async (ticketId: string) => {
    setSaving(true)
    try {
      await api.post(`/admin/support/tickets/${ticketId}/assign-me`)
      toast.success('Ticket assigned')
      await loadSupport()
      setSelectedId(ticketId)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to assign ticket')
    } finally {
      setSaving(false)
    }
  }

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return
    setSaving(true)
    try {
      await api.post(`/admin/support/tickets/${selectedTicket._id}/messages`, {
        message: reply,
      })
      setReply('')
      toast.success('Reply sent')
      await loadSupport()
      setSelectedId(selectedTicket._id)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Unable to send reply')
    } finally {
      setSaving(false)
    }
  }

  const assignedOwner = owner(selectedTicket?.assignedTo ?? undefined)
  const investorOwner = owner(selectedTicket?.userId ?? undefined)

  return (
    <PageShell
      title='Support'
      description='Investor cases, disputes, and account help desk queue.'
    >
      <div className='grid gap-4 md:grid-cols-3'>
        <MetricCard label='Open Cases' value={summary.open} icon={Ticket} />
        <MetricCard label='Pending Replies' value={summary.pending} icon={Landmark} />
        <MetricCard label='Urgent Cases' value={summary.urgent} icon={CreditCard} />
      </div>

      {loading ? (
        <Card className='mt-4'>
          <CardContent className='flex h-56 items-center justify-center'>
            <Loader2 className='text-muted-foreground h-6 w-6 animate-spin' />
          </CardContent>
        </Card>
      ) : tickets.length === 0 ? (
        <div className='mt-4'>
          <EmptyState label='No support tickets are available yet.' />
        </div>
      ) : (
        <div className='mt-4 grid gap-4 lg:grid-cols-12'>
          <Card className='lg:col-span-5'>
            <CardHeader>
              <CardTitle>Ticket Queue</CardTitle>
              <CardDescription>
                Sorted by most recent support activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => {
                    const ticketOwner = owner(ticket.userId)
                    return (
                      <TableRow
                        key={ticket._id}
                        className='cursor-pointer'
                        data-state={
                          selectedTicket?._id === ticket._id ? 'selected' : undefined
                        }
                        onClick={() => setSelectedId(ticket._id)}
                      >
                        <TableCell>
                          <div>
                            <p className='font-semibold'>{ticketOwner.name}</p>
                            <p className='text-muted-foreground text-xs'>
                              {ticketOwner.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className='font-medium'>{ticket.subject}</p>
                            <p className='text-muted-foreground text-xs capitalize'>
                              {ticket.category} · {ticket.priority}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant='secondary'>{ticket.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className='lg:col-span-7'>
            <CardHeader>
              <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
                <div>
                  <CardTitle>{selectedTicket?.subject}</CardTitle>
                  <CardDescription>
                    {investorOwner.name} · {investorOwner.email}
                  </CardDescription>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <select
                    value={selectedTicket?.status}
                    disabled={saving || !selectedTicket}
                    onChange={(event) =>
                      selectedTicket &&
                      updateTicket(selectedTicket._id, {
                        status: event.target.value as SupportTicket['status'],
                      })
                    }
                    className='border-input bg-background rounded-md border px-3 py-2 text-sm'
                  >
                    <option value='open'>Open</option>
                    <option value='pending'>Pending</option>
                    <option value='resolved'>Resolved</option>
                    <option value='closed'>Closed</option>
                  </select>
                  <select
                    value={selectedTicket?.priority}
                    disabled={saving || !selectedTicket}
                    onChange={(event) =>
                      selectedTicket &&
                      updateTicket(selectedTicket._id, {
                        priority: event.target.value as SupportTicket['priority'],
                      })
                    }
                    className='border-input bg-background rounded-md border px-3 py-2 text-sm'
                  >
                    <option value='low'>Low</option>
                    <option value='normal'>Normal</option>
                    <option value='high'>High</option>
                    <option value='urgent'>Urgent</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid gap-3 md:grid-cols-3'>
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-xs'>Assigned To</p>
                  <p className='text-sm font-semibold'>
                    {selectedTicket?.assignedTo ? assignedOwner.name : 'Unassigned'}
                  </p>
                </div>
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-xs'>Last Activity</p>
                  <p className='text-sm font-semibold'>
                    {date(selectedTicket?.lastActivityAt)}
                  </p>
                </div>
                <div className='rounded-lg border p-3'>
                  <p className='text-muted-foreground text-xs'>Messages</p>
                  <p className='text-sm font-semibold'>
                    {selectedTicket?.messages.length ?? 0}
                  </p>
                </div>
              </div>

              <div className='max-h-[420px] space-y-3 overflow-y-auto pr-1'>
                {selectedTicket?.messages.map((message, index) => {
                  const author = owner(message.authorId)
                  return (
                    <div
                      key={`${message.createdAt}-${index}`}
                      className='rounded-lg border p-4'
                    >
                      <div className='mb-2 flex items-center justify-between gap-3'>
                        <div>
                          <p className='text-sm font-semibold'>
                            {message.authorRole === 'investor'
                              ? author.name
                              : `Staff · ${author.name}`}
                          </p>
                          <p className='text-muted-foreground text-xs capitalize'>
                            {message.authorRole}
                          </p>
                        </div>
                        <p className='text-muted-foreground text-xs'>
                          {date(message.createdAt)}
                        </p>
                      </div>
                      <p className='text-sm whitespace-pre-wrap'>{message.body}</p>
                    </div>
                  )
                })}
              </div>

              <div className='space-y-3'>
                <textarea
                  value={reply}
                  disabled={saving || selectedTicket?.status === 'closed'}
                  onChange={(event) => setReply(event.target.value)}
                  className='border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm'
                  placeholder={
                    selectedTicket?.status === 'closed'
                      ? 'Closed tickets cannot receive replies.'
                      : 'Write a support reply...'
                  }
                />
                <div className='flex flex-wrap gap-2'>
                  <Button
                    disabled={saving || !selectedTicket}
                    onClick={() => selectedTicket && assignToMe(selectedTicket._id)}
                    variant='outline'
                  >
                    Assign to me
                  </Button>
                  <Button
                    disabled={
                      saving ||
                      !selectedTicket ||
                      !reply.trim() ||
                      selectedTicket.status === 'closed'
                    }
                    onClick={sendReply}
                  >
                    {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                    Send reply
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </PageShell>
  )
}

export const adminPageIcons = {
  investors: Users,
  packages: Boxes,
  transactions: ClipboardList,
  withdrawals: CreditCard,
  deposits: Banknote,
  investments: PackagePlus,
  settings: Save,
  audits: Download,
  support: Ticket,
}
