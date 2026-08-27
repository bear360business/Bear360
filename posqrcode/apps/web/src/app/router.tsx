import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AuthLayout } from '@/layouts/AuthLayout'
import { OnboardingLayout } from '@/layouts/OnboardingLayout'
import { SuperAdminLayout } from '@/layouts/SuperAdminLayout'
import { RestaurantAdminLayout } from '@/layouts/RestaurantAdminLayout'
import { KitchenLayout } from '@/layouts/KitchenLayout'
import { CustomerLayout } from '@/layouts/CustomerLayout'
import { RootLayout } from '@/layouts/RootLayout'

import { SuperLoginPage } from '@/features/super/login/SuperLoginPage'
import { SuperDashboardPage } from '@/features/super/dashboard/SuperDashboardPage'
import { RestaurantsPage } from '@/features/super/restaurants/RestaurantsPage'
import { CreateRestaurantPage } from '@/features/super/restaurants/CreateRestaurantPage'
import { PlansPage } from '@/features/super/plans/PlansPage'
import { IndustriesPage } from '@/features/super/industries/IndustriesPage'
import { SuperSettingsPage } from '@/features/super/settings/SuperSettingsPage'
import { SuperSupportPage } from '@/features/super/support/SuperSupportPage'
import { SuperLeadsPage } from '@/features/super/leads/SuperLeadsPage'
import { SuperShopPage } from '@/features/super/shop/SuperShopPage'

import { LoginPage } from '@/features/admin/login/LoginPage'
import { StaffLoginPage } from '@/features/admin/login/StaffLoginPage'
import { StaffNoAccessPage } from '@/features/admin/staff/StaffNoAccessPage'
import { StaffRouteGuard } from '@/components/app/StaffRouteGuard'
import { ForgotPasswordPage } from '@/features/admin/forgot/ForgotPasswordPage'
import { ForgotOtpPage } from '@/features/admin/forgot/ForgotOtpPage'
import { ForgotResetPage } from '@/features/admin/forgot/ForgotResetPage'
import { SignupEmailPage } from '@/features/admin/signup/SignupEmailPage'
import { OtpVerifyPage } from '@/features/admin/signup/OtpVerifyPage'
import { SetPasswordPage } from '@/features/admin/signup/SetPasswordPage'
import { StoreOnboardingPage } from '@/features/admin/onboarding/StoreOnboardingPage'
import { CustomersPage } from '@/features/admin/customers/CustomersPage'
import { QrDesignerPage } from '@/features/admin/qr/QrDesignerPage'
import { MenuAppearancePage } from '@/features/admin/menu/MenuAppearancePage'
import { ShopPage } from '@/features/admin/shop/ShopPage'
import { PosStaffPage } from '@/features/admin/staff/PosStaffPage'
import { VenueSetupPage } from '@/features/admin/venue/VenueSetupPage'
import { ProfileSettingsPage } from '@/features/admin/profile/ProfileSettingsPage'
import { SupportPage } from '@/features/admin/support/SupportPage'
import { DashboardPage } from '@/features/admin/dashboard/DashboardPage'
import { TablesShell } from '@/features/admin/tables/TablesShell'
import { TablesPage } from '@/features/admin/tables/TablesPage'
import { ReservationsPage } from '@/features/admin/tables/ReservationsPage'
import { MenuShell } from '@/features/admin/menu/MenuShell'
import { MenuPage } from '@/features/admin/menu/MenuPage'
import { MenuCategoriesPage } from '@/features/admin/menu/MenuCategoriesPage'
import { OrdersPage } from '@/features/admin/orders/OrdersPage'
import { IntegrationsPage } from '@/features/admin/integrations/IntegrationsPage'
import { PosPage } from '@/features/admin/pos/PosPage'
import { KitchenPage } from '@/features/admin/kitchen/KitchenPage'
import { SettingsPage } from '@/features/admin/settings/SettingsPage'
import { BillingPage } from '@/features/admin/billing/BillingPage'
import { InventoryShell } from '@/features/admin/inventory/InventoryShell'
import { InventoryPage } from '@/features/admin/inventory/InventoryPage'
import { IngredientsPage } from '@/features/admin/inventory/IngredientsPage'
import { CategoriesPage } from '@/features/admin/inventory/CategoriesPage'
import { SuppliersPage } from '@/features/admin/inventory/SuppliersPage'
import { PurchasesPage } from '@/features/admin/inventory/PurchasesPage'
import { StaffShell } from '@/features/admin/staff/StaffShell'
import { StaffPage } from '@/features/admin/staff/StaffPage'
import { RolesPage } from '@/features/admin/staff/RolesPage'
import { SchedulePage } from '@/features/admin/staff/SchedulePage'
import { AttendancePage } from '@/features/admin/staff/AttendancePage'
import { PayrollPage } from '@/features/admin/staff/PayrollPage'
import { ModuleComingSoon } from '@/features/admin/ModuleComingSoon'
import { FeatureGate } from '@/components/app/FeatureGate'
import { usePlatformConfig } from '@/hooks/use-platform-config'
import { FeatureDisabled } from '@/components/app/FeatureDisabled'
import { type MenuKey } from '@/lib/platform-config'

function PlatformMenuGate({ menuKey, children }: { menuKey: MenuKey; children: React.ReactNode }) {
  const { config } = usePlatformConfig()
  const enabled = (config.menus as any)?.[menuKey] ?? true
  return enabled ? <>{children}</> : <FeatureDisabled />
}


import { TableLandingPage } from '@/features/customer/landing/TableLandingPage'
import { CustomerMenuPage } from '@/features/customer/menu/CustomerMenuPage'
import { CartPage } from '@/features/customer/cart/CartPage'
import { SuccessPage } from '@/features/customer/success/SuccessPage'

import { NotFoundPage } from '@/features/NotFoundPage'
import { MarketingLandingPage } from '@/features/marketing/MarketingLandingPage'
import { ContactPage } from '@/features/marketing/ContactPage'
import { PortalsPage } from '@/features/PortalsPage'
import { QrTestPage } from '@/features/QrTestPage'

/**
 * Three route trees sharing one design system (doc §3), all nested under a
 * pathless RootLayout so router-dependent providers reach every shell.
 */
export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
  {
    element: <AuthLayout />,
    children: [
      { path: '/super/login', element: <SuperLoginPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/staff-login', element: <StaffLoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/forgot-password/otp', element: <ForgotOtpPage /> },
      { path: '/forgot-password/reset', element: <ForgotResetPage /> },
      { path: '/signup', element: <SignupEmailPage /> },
      { path: '/signup/otp', element: <OtpVerifyPage /> },
      { path: '/signup/password', element: <SetPasswordPage /> },
      /** Legacy path — create-store lives only at /onboarding. */
      { path: '/store-setup', element: <Navigate to="/onboarding" replace /> },
    ],
  },
  {
    element: <OnboardingLayout />,
    children: [{ path: '/onboarding', element: <StoreOnboardingPage /> }],
  },
  {
    path: '/super',
    element: <SuperAdminLayout />,
    children: [
      { index: true, element: <Navigate to="/super/dashboard" replace /> },
      { path: 'dashboard', element: <SuperDashboardPage /> },
      { path: 'restaurants', element: <RestaurantsPage /> },
      { path: 'restaurants/create', element: <CreateRestaurantPage /> },
      { path: 'restaurants/:id/edit', element: <CreateRestaurantPage /> },
      { path: 'support', element: <SuperSupportPage /> },
      { path: 'leads', element: <SuperLeadsPage /> },
      { path: 'industries', element: <IndustriesPage /> },
      { path: 'plans', element: <PlansPage /> },
      { path: 'shop', element: <SuperShopPage /> },
      { path: 'settings', element: <SuperSettingsPage /> },
    ],
  },
  {
    element: <RestaurantAdminLayout />,
    children: [
      {
        element: <StaffRouteGuard />,
        children: [
      { path: '/dashboard', element: <PlatformMenuGate menuKey="dashboard"><DashboardPage /></PlatformMenuGate> },
      { path: '/staff-access', element: <StaffNoAccessPage /> },
      {
        path: '/tables',
        element: (
          <PlatformMenuGate menuKey="tables">
            <FeatureGate feature="tables">
              <TablesShell />
            </FeatureGate>
          </PlatformMenuGate>
        ),
        children: [
          { index: true, element: <TablesPage /> },
          { path: 'reservations', element: <ReservationsPage /> },
        ],
      },
      {
        path: '/menu',
        element: (
          <PlatformMenuGate menuKey="menu">
            <MenuShell />
          </PlatformMenuGate>
        ),
        children: [
          { index: true, element: <MenuPage /> },
          { path: 'categories', element: <MenuCategoriesPage /> },
          { path: 'appearance', element: <MenuAppearancePage /> },
        ],
      },
      { path: '/orders', element: <PlatformMenuGate menuKey="orders"><OrdersPage /></PlatformMenuGate> },
      { path: '/integrations', element: <PlatformMenuGate menuKey="integrations"><IntegrationsPage /></PlatformMenuGate> },
      { path: '/qr', element: <PlatformMenuGate menuKey="qrDesigner"><QrDesignerPage /></PlatformMenuGate> },
      { path: '/customers', element: <PlatformMenuGate menuKey="customers"><CustomersPage /></PlatformMenuGate> },
      { path: '/finance', element: <Navigate to="/dashboard?tab=finance" replace /> },
      { path: '/shop', element: <PlatformMenuGate menuKey="shop"><ShopPage /></PlatformMenuGate> },
      { path: '/venue-setup', element: <PlatformMenuGate menuKey="orderingCheckout"><VenueSetupPage /></PlatformMenuGate> },
      { path: '/profile', element: <PlatformMenuGate menuKey="storeProfile"><ProfileSettingsPage /></PlatformMenuGate> },
      // Plan-gated routes never 404 — FeatureGate renders the upgrade page.
      {
        path: '/pos',
        element: (
          <PlatformMenuGate menuKey="pos">
            <FeatureGate feature="pos">
              <PosPage />
            </FeatureGate>
          </PlatformMenuGate>
        ),
      },
      {
        path: '/inventory',
        element: (
          <PlatformMenuGate menuKey="inventory">
            <FeatureGate feature="inventory">
              <InventoryShell />
            </FeatureGate>
          </PlatformMenuGate>
        ),
        children: [
          { index: true, element: <InventoryPage /> },
          { path: 'items', element: <IngredientsPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'suppliers', element: <SuppliersPage /> },
          { path: 'purchases', element: <PurchasesPage /> },
        ],
      },
      {
        path: '/staff',
        element: (
          <PlatformMenuGate menuKey="staff">
            <FeatureGate feature="staff">
              <StaffShell />
            </FeatureGate>
          </PlatformMenuGate>
        ),
        children: [
          { index: true, element: <StaffPage /> },
          { path: 'pos', element: <PosStaffPage /> },
          { path: 'roles', element: <RolesPage /> },
          { path: 'schedule', element: <SchedulePage /> },
          { path: 'attendance', element: <AttendancePage /> },
          { path: 'payroll', element: <PayrollPage /> },
        ],
      },
      {
        path: '/ai',
        element: (
          <PlatformMenuGate menuKey="aiInsights">
            <FeatureGate feature="ai">
              <ModuleComingSoon
                title="AI Insights"
                summary="A manager that watches your numbers around the clock: stock-out predictions, menu opportunities, wastage anomalies and staffing recommendations."
                screens={['Insight feed', 'Ask bar', 'Dashboard insight strip']}
                phase="build phase 8 — it needs 14 days of inventory and staff data first"
              />
            </FeatureGate>
          </PlatformMenuGate>
        ),
      },
      { path: '/reports', element: <Navigate to="/dashboard?tab=reports" replace /> },
      { path: '/support', element: <PlatformMenuGate menuKey="support"><SupportPage /></PlatformMenuGate> },
      { path: '/billing', element: <PlatformMenuGate menuKey="billing"><BillingPage /></PlatformMenuGate> },
      { path: '/settings', element: <PlatformMenuGate menuKey="settings"><SettingsPage /></PlatformMenuGate> },
        ],
      },
    ],
  },
  {
    path: '/kitchen',
    element: (
      <PlatformMenuGate menuKey="kitchen">
        <KitchenLayout />
      </PlatformMenuGate>
    ),
    children: [{ index: true, element: <KitchenPage /> }],
  },
  {
    path: '/r/:restaurantId/table/:tableId',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <TableLandingPage /> },
      { path: 'menu', element: <CustomerMenuPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'success', element: <SuccessPage /> },
    ],
  },
  {
    // Table-free counter QR — same screens, no table (takeaway / delivery).
    path: '/r/:restaurantId',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <TableLandingPage /> },
      { path: 'menu', element: <CustomerMenuPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'success', element: <SuccessPage /> },
    ],
  },
  { path: '/', element: <MarketingLandingPage /> },
  { path: '/contact', element: <ContactPage /> },
  { path: '/portals', element: <PortalsPage /> },
  { path: '/qr-test', element: <QrTestPage /> },
  { path: '*', element: <NotFoundPage /> },
    ],
  },
])
