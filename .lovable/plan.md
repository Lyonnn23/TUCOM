## Fleet Management Module (TÜcom Empresa)

Build a complete B2B fleet management layer on top of the existing consumer app, sharing infrastructure (auth, fuel_logs, vehicles) but adding organization-scoped views, roles, and reporting.

### 1. Database (migration)

New tables:
- `organizations` — id, name, company_code (unique 8-char), logo_url, plan ('basico'|'pro'), max_vehicles, created_by, timestamps
- `organization_members` — org_id, user_id, role ('admin'|'driver'), joined_at, unique(org_id, user_id)
- Extend `user_vehicles` with nullable `organization_id` (fleet vehicles)
- Extend `fuel_logs` already references vehicle_id → fleet attribution flows automatically

Functions:
- `generate_company_code()` — random 8-char unique code
- `get_user_org_role(uid)` returns (org_id, role) — security-definer to avoid recursion
- `is_org_admin(uid, org_id)` security-definer
- `get_fleet_stats(_org_id)` — returns aggregated month spend, cost/km, vehicle count
- `get_fleet_vehicle_breakdown(_org_id, _month_start)` — per-vehicle table data

RLS:
- Orgs: members can SELECT their org; only creator/admin can UPDATE
- Members: admins manage; everyone sees own membership and members of their org
- Fleet vehicles (org_id IS NOT NULL): visible to org admins + owning driver; only driver edits
- Fleet fuel_logs: admin of vehicle's org can SELECT; driver still owns insert/update/delete

### 2. Frontend pages

- `/empresa` — Landing page (public): hero CTA "Gestiona los gastos de combustible de tu empresa", feature grid, plan comparison, "Crear organización" + "Unirme con código"
- `/empresa/dashboard` — Admin: summary cards (total spend month, avg cost/km, top spender), fleet table (vehicle/driver/cost/km/$/km/last fill-up), bar chart spend per vehicle, line chart spend over time, anomaly alerts (>20% above fleet avg)
- `/empresa/configuracion` — Admin: org name, logo upload (storage bucket `org-logos`), company code copy button, member list with roles, remove member
- `/empresa/reportes` — Admin: month picker → PDF download (jsPDF with logo + per-vehicle breakdown), CSV export
- `/empresa/mi-vehiculo` — Driver: personal stats, "+12% vs last month" alert, link to log fill-up

### 3. Components

- `OrgGuard` — redirects to /empresa if no org
- `OrgAdminGuard` — requires admin role
- `JoinOrgDialog` / `CreateOrgDialog`
- `FleetSummaryCards`, `FleetVehiclesTable`, `FleetSpendChart`, `FleetCostPerKmChart`, `AnomalyBanner`
- `FleetPdfReport` (jsPDF) + `FleetCsvExport`

### 4. Hooks

- `useOrganization()` — current user's org + role
- `useFleetStats(orgId)`, `useFleetBreakdown(orgId, month)`, `useFleetMembers(orgId)`
- `useOrgVehicles(orgId)` for fleet table joining vehicles + month spend

### 5. Storage

- New bucket `org-logos` (public read, admin-of-org write via RLS)

### 6. Integration touchpoints

- Add `/empresa` link in main nav + Profile page
- Plan paywall: when admin tries to add 4th fleet vehicle on Básico → existing `PaywallModal` with empresa copy
- Add route to `App.tsx`

### Technical notes

- Plans: `empresa_basico` (3 vehicles, $0), `empresa_pro` (unlimited, pricing TBD shown as "Contactar"). No Stripe wiring yet — reuse existing placeholder checkout button + WhatsApp contact for now.
- PDF: client-side jsPDF + autotable (already used elsewhere? check; otherwise add `jspdf` + `jspdf-autotable`)
- Anomaly: compute fleet avg cost/km, flag vehicles where vehicle.cost_per_km > 1.2 * fleet_avg
- Cost per km derived from consecutive odometer readings in fuel_logs (use existing `get_user_consumption_stats` pattern, new `get_fleet_vehicle_breakdown` SQL function)
- All UI in Spanish, TÜcom branding (purple→blue gradient), semantic tokens only.