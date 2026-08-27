# Admin Controls and Separation of Concerns

- **QR Stands & Shop Catalog**: Strictly managed by the Super Admin (at `/super/shop`). Restaurant owners browse and read this catalog (at `/shop`) in a view-only mode.
- **Dynamic Service & UI Controls**: Managed by the Super Admin (at `/super/settings` under Platform Controls). These controls apply live to the restaurant features and cannot be modified by the restaurant owners.
- **Development Constraint**: When modifying settings pages or shops, always ensure platform-level configurations remain gated under the Super Admin panel and read-only for the restaurant panel.
