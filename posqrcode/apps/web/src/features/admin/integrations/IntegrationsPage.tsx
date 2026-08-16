import { useMemo } from 'react'
import { toast } from 'sonner'
import { CloudCog, Download, Link2, RefreshCw, Unplug } from 'lucide-react'
import { PageHeader } from '@/components/app/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useMenu } from '@/hooks/use-menu'
import { useOrders } from '@/hooks/use-orders'
import { useVenueBagState } from '@/hooks/use-venue-bag'
import { useCurrentVenue } from '@/hooks/use-restaurants'
import type { OrderChannel } from '@/lib/types'

type PartnerId = Extract<OrderChannel, 'swiggy' | 'zomato'>

interface PartnerConnection {
  connected: boolean
  outletId: string
  autoAccept: boolean
  lastMenuSync?: string
  lastOrderSync?: string
}

type IntegrationConfig = Record<PartnerId, PartnerConnection>

const PARTNERS: Array<{ id: PartnerId; name: string; color: string }> = [
  { id: 'swiggy', name: 'Swiggy', color: 'bg-orange-500' },
  { id: 'zomato', name: 'Zomato', color: 'bg-red-500' },
]

const defaults = (): IntegrationConfig => ({
  swiggy: { connected: false, outletId: '', autoAccept: true },
  zomato: { connected: false, outletId: '', autoAccept: true },
})

/**
 * Delivery partner connector shell.
 * Connection and inbound orders are simulated until approved Swiggy/Zomato
 * partner credentials are configured on a backend integration service.
 */
export function IntegrationsPage() {
  const restaurant = useCurrentVenue()
  const { items } = useMenu()
  const { orders, placeOrder } = useOrders()
  const { value: config, setValue: setConfig } = useVenueBagState<IntegrationConfig>({
    storageKey: 'bearqr:delivery-integrations',
    bag: 'deliveryIntegrations',
    seed: defaults(),
    isEmpty: (v) => !v || typeof v !== 'object' || Array.isArray(v),
  })

  const connected = PARTNERS.filter((partner) => config[partner.id]?.connected)
  const partnerOrders = useMemo(
    () => orders.filter((order) => order.channel === 'swiggy' || order.channel === 'zomato'),
    [orders],
  )

  const patch = (id: PartnerId, change: Partial<PartnerConnection>) =>
    setConfig((prev) => ({
      ...defaults(),
      ...prev,
      [id]: { ...defaults()[id], ...prev[id], ...change },
    }))

  const connect = (id: PartnerId) => {
    const outletId = config[id]?.outletId?.trim() ?? ''
    if (!outletId) {
      toast.error(`Add the ${PARTNERS.find((p) => p.id === id)?.name} outlet ID first`)
      return
    }
    patch(id, { connected: true, lastOrderSync: new Date().toISOString() })
    toast.success(`${PARTNERS.find((p) => p.id === id)?.name} connected`, {
      description: 'Saved to venue — use approved partner credentials for live orders.',
    })
  }

  const syncMenu = (id: PartnerId) => {
    if (!config[id]?.connected) return
    patch(id, { lastMenuSync: new Date().toISOString() })
    toast.success(`${items.filter((item) => item.available).length} available menu items synced`, {
      description: `Simulated ${PARTNERS.find((p) => p.id === id)?.name} menu sync.`,
    })
  }

  const simulateOrder = async (id: PartnerId) => {
    if (!config[id]?.connected) return
    const available = items.filter((item) => item.available)
    const pick = available[Math.floor(Math.random() * Math.max(available.length, 1))]
    if (!pick) {
      toast.error('Add menu items before simulating a partner order')
      return
    }
    const created = await placeOrder({
      restaurantId: restaurant.id,
      channel: id,
      origin: 'partner',
      orderType: 'delivery',
      tableName: PARTNERS.find((p) => p.id === id)?.name,
      customerName: `${PARTNERS.find((p) => p.id === id)?.name} guest`,
      items: [{ menuItemId: pick.id, name: pick.name, qty: 1, price: pick.price }],
      paymentMethod: 'online',
      paid: true,
    })
    patch(id, { lastOrderSync: new Date().toISOString() })
    toast.success(`Simulated ${id} order ${created.token}`)
  }

  return (
    <>
      <PageHeader
        title="Integrations"
        caption="Delivery partners — connection state syncs via API in live mode."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary">{connected.length} connected</Badge>
        <Badge variant="outline">{partnerOrders.length} partner orders</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PARTNERS.map((partner) => {
          const row = { ...defaults()[partner.id], ...config[partner.id] }
          return (
            <Card key={partner.id} className="rounded-card border-line shadow-card">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${partner.color}`}>
                    <CloudCog className="h-5 w-5 text-white" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{partner.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {row.connected ? `Outlet ${row.outletId}` : 'Not connected'}
                    </p>
                  </div>
                  <Badge variant={row.connected ? 'default' : 'outline'}>
                    {row.connected ? 'Live demo' : 'Off'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${partner.id}-outlet`}>Outlet ID</Label>
                  <Input
                    id={`${partner.id}-outlet`}
                    value={row.outletId}
                    disabled={row.connected}
                    onChange={(e) => patch(partner.id, { outletId: e.target.value })}
                    placeholder="e.g. OUT-12345"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Auto-accept orders</p>
                    <p className="text-xs text-muted-foreground">When connected</p>
                  </div>
                  <Switch
                    checked={row.autoAccept}
                    onCheckedChange={(v) => patch(partner.id, { autoAccept: v })}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {row.connected ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => syncMenu(partner.id)}>
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Sync menu
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void simulateOrder(partner.id)}>
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Simulate order
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch(partner.id, { connected: false })}
                      >
                        <Unplug className="mr-1.5 h-3.5 w-3.5" />
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => connect(partner.id)}>
                      <Link2 className="mr-1.5 h-3.5 w-3.5" />
                      Connect
                    </Button>
                  )}
                </div>

                {(row.lastMenuSync || row.lastOrderSync) && (
                  <p className="text-[11px] text-muted-foreground">
                    {row.lastMenuSync && `Menu sync ${new Date(row.lastMenuSync).toLocaleString()} · `}
                    {row.lastOrderSync && `Orders ${new Date(row.lastOrderSync).toLocaleString()}`}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
