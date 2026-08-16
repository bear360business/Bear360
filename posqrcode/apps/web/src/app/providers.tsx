import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppearanceProvider, useAppearance } from '@/hooks/use-appearance'
import { AuthProvider } from '@/hooks/use-auth'
import { DemoFlowBridge } from '@/hooks/DemoFlowBridge'
import { IndustriesProvider } from '@/hooks/use-industries'
import { InventoryProvider } from '@/hooks/use-inventory'
import { MenuProvider } from '@/hooks/use-menu'
import { NavConfigProvider } from '@/hooks/use-nav-config'
import { OrdersProvider } from '@/hooks/use-orders'
import { PlansProvider } from '@/hooks/use-plans'
import { PlatformConfigProvider } from '@/hooks/use-platform-config'
import { RestaurantsProvider } from '@/hooks/use-restaurants'
import { ServiceConfigProvider } from '@/hooks/use-service-config'
import { StaffProvider } from '@/hooks/use-staff'
import { StaffRolesProvider } from '@/hooks/use-staff-roles'
import { LeadsProvider } from '@/hooks/use-leads'
import { ShopProvider } from '@/hooks/use-shop'
import { SupportProvider } from '@/hooks/use-support'
import { TablesProvider } from '@/hooks/use-tables'
import { TenantProvider } from '@/hooks/use-tenant'
import { clearLegacyMockStorage } from '@/lib/clear-mock-storage'

clearLegacyMockStorage()

/** Sonner toaster that follows the admin-selected light/dark mode. */
function AppToaster() {
  const { appearance } = useAppearance()
  return <Toaster position="top-right" theme={appearance.mode} richColors closeButton />
}

/**
 * App-wide providers. Orders + Tables + Inventory share localStorage so the
 * UI-only demo stays coherent across QR, POS, kitchen, floor and stock.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AppearanceProvider>
      <AuthProvider>
        <PlatformConfigProvider>
          <PlansProvider>
            <IndustriesProvider>
              <RestaurantsProvider>
                <ServiceConfigProvider>
                  <TenantProvider>
                    <NavConfigProvider>
                      <MenuProvider>
                        <OrdersProvider>
                          <TablesProvider>
                            <InventoryProvider>
                              <StaffRolesProvider>
                                <StaffProvider>
                                  <SupportProvider>
                                    <LeadsProvider>
                                      <ShopProvider>
                                        <DemoFlowBridge />
                                        <TooltipProvider delayDuration={200}>
                                          <div className="flex h-full min-h-[100svh] flex-col">
                                            {children}
                                          </div>
                                          <AppToaster />
                                        </TooltipProvider>
                                      </ShopProvider>
                                    </LeadsProvider>
                                  </SupportProvider>
                                </StaffProvider>
                              </StaffRolesProvider>
                            </InventoryProvider>
                          </TablesProvider>
                        </OrdersProvider>
                      </MenuProvider>
                    </NavConfigProvider>
                  </TenantProvider>
                </ServiceConfigProvider>
              </RestaurantsProvider>
            </IndustriesProvider>
          </PlansProvider>
        </PlatformConfigProvider>
      </AuthProvider>
    </AppearanceProvider>
  )
}
