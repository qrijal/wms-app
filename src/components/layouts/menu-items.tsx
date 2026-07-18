import {
  LayoutDashboard, Package, MapPin, Users, Truck, ArrowDownUp,
  ScanLine, Building2, GitBranch, Warehouse, Boxes,
  FileText,
} from 'lucide-react'

export const superadminMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  {
    label: 'Master Data',
    icon: Package,
    children: [
      { label: 'Brands', icon: Package, path: '/brands' },
      { label: 'UOMs', icon: Package, path: '/uoms' },
      { label: 'Products', icon: Package, path: '/master-product' },
      { label: 'Locations', icon: MapPin, path: '/master-location' },
    ],
  },
  { label: 'Master Location', icon: MapPin, path: '/master-location' },
  {
    label: 'Organisasi',
    icon: Building2,
    children: [
      { label: 'Companies', icon: Building2, path: '/companies' },
      { label: 'Branches', icon: GitBranch, path: '/branches' },
      { label: 'Warehouses', icon: Warehouse, path: '/warehouses' },
    ],
  },
  {
    label: 'Pengguna',
    icon: Users,
    children: [
      { label: 'Manajemen Admin', icon: Users, path: '/users' },
    ],
  },
]

export const adminMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  {
    label: 'Master Data',
    icon: Package,
    children: [
      { label: 'Brands', icon: Package, path: '/brands' },
      { label: 'UOMs', icon: Package, path: '/uoms' },
      { label: 'Products', icon: Package, path: '/master-product' },
      { label: 'Locations', icon: MapPin, path: '/master-location' },
    ],
  },
  { label: 'Master Location', icon: MapPin, path: '/master-location' },
  {
    label: 'Transaksi',
    icon: ArrowDownUp,
    children: [
      { label: 'Inbound', icon: Truck, path: '/inbound' },
      { label: 'Outbound', icon: Truck, path: '/outbound' },
      { label: 'Transfer', icon: ArrowDownUp, path: '/transfer/new' },
    ],
  },
  {

    label: 'Inventory', icon: Package, path: '/inventory'
  },
]