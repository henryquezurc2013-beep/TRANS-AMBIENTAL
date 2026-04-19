import {
  LayoutDashboard, Plus, ClipboardList, Warehouse, AlertTriangle, AlertCircle,
  Package, Users, ArrowLeftRight, Wrench, FileText, ScrollText,
  LogOut, LogIn, Eye, EyeOff, Check, CheckCircle, X,
  Sun, Moon, Truck, Pencil, Trash2, Shield, ShieldOff, MapPin,
  Download, Search, Menu, Clock, ArrowRight, Recycle,
  Bell, ChevronRight, Zap, FileSpreadsheet, FileJson, Printer, Loader2, Info,
} from 'lucide-react'

const ICONS = {
  dashboard:      LayoutDashboard,
  plus:           Plus,
  plus_circle:    Plus,
  clipboard:      ClipboardList,
  warehouse:      Warehouse,
  alert:          AlertTriangle,
  alert_circle:   AlertCircle,
  package:        Package,
  users:          Users,
  swap:           ArrowLeftRight,
  wrench:         Wrench,
  file:           FileText,
  file_spreadsheet: FileSpreadsheet,
  file_json:      FileJson,
  scroll:         ScrollText,
  logout:         LogOut,
  login:          LogIn,
  eye:            Eye,
  eyeoff:         EyeOff,
  check:          Check,
  check_circle:   CheckCircle,
  x:              X,
  sun:            Sun,
  moon:           Moon,
  truck:          Truck,
  pencil:         Pencil,
  trash:          Trash2,
  shield:         Shield,
  shield_off:     ShieldOff,
  mappin:         MapPin,
  download:       Download,
  search:         Search,
  menu:           Menu,
  clock:          Clock,
  arrow_right:    ArrowRight,
  recycle:        Recycle,
  bell:           Bell,
  chevron_right:  ChevronRight,
  zap:            Zap,
  printer:        Printer,
  loader:         Loader2,
  info:           Info,
} as const

type IconName = keyof typeof ICONS

interface IconProps {
  name: IconName | string
  size?: number
  color?: string
  style?: React.CSSProperties
  className?: string
}

export default function Icon({ name, size = 16, color, style, className }: IconProps) {
  const Component = ICONS[name as IconName]
  if (!Component) return null
  return <Component size={size} color={color} style={style} className={className} />
}
