
import React from 'react';
import { 
  LayoutDashboard, 
  ListTodo, 
  Users, 
  CreditCard, 
  ShieldCheck, 
  Settings, 
  LogOut,
  TrendingUp,
  Gift,
  Bell,
  Moon,
  Sun,
  ExternalLink,
  Youtube,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Zap,
  Wallet,
  DollarSign,
  Shield,
  Lock,
  ShoppingCart,
  Upload,
  Edit,
  ArrowRight,
  Download,
  Smartphone,
  Share2,
  MoreVertical
} from 'lucide-react';

export const COLORS = {
  primary: '#10b981', // Emerald 500
  secondary: '#3b82f6', // Blue 500
  accent: '#f59e0b', // Amber 500
  danger: '#ef4444', // Red 500
  dark: '#0f172a', // Slate 900
};

/**
 * Unique "EarnZone Coin" Logo 
 * Based on user reference: Emerald rounded box, gold coin outlines, growth badge.
 */
const EarnZoneLogo = ({ size = 32, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Rich Emerald Rounded Square Container */}
    <rect x="10" y="10" width="80" height="80" rx="24" fill="#067647" />
    
    {/* First Golden Coin Outline */}
    <circle cx="45" cy="40" r="15" stroke="#fbbf24" strokeWidth="4.5" fill="#067647" />
    <text x="45" y="45" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">1</text>
    
    {/* Second Golden Coin Outline (Overlapping beneath) */}
    <circle cx="58" cy="55" r="15" stroke="#fbbf24" strokeWidth="4.5" fill="#067647" />
    <text x="58" y="60" textAnchor="middle" fill="#fbbf24" fontSize="14" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">1</text>

    {/* Overlapping White Trend/Growth Badge on bottom-right */}
    <g filter="url(#badgeShadow)">
      <circle cx="76" cy="76" r="16" fill="#ffffff" />
      {/* Dynamic Green Upward Rising Trend Arrow */}
      <path 
        d="M67 80 L73 74 L77 78 L84 70" 
        stroke="#10b981" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M78 70 H84 V76" 
        stroke="#10b981" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </g>

    <defs>
      {/* Shadow for the white overlapping badge */}
      <filter id="badgeShadow" x="56" y="56" width="40" height="40" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.22" />
      </filter>
    </defs>
  </svg>
);

export const ICONS = {
  Logo: EarnZoneLogo,
  Dashboard: LayoutDashboard,
  Tasks: ListTodo,
  Referral: Users,
  // Added Users mapping to resolve type errors in components
  Users: Users,
  Withdraw: CreditCard,
  Admin: ShieldCheck,
  Shield: Shield,
  Settings: Settings,
  Logout: LogOut,
  Trend: TrendingUp,
  Gift: Gift,
  Bell: Bell,
  Moon: Moon,
  Sun: Sun,
  Link: ExternalLink,
  Youtube: Youtube,
  Image: ImageIcon,
  Check: CheckCircle,
  XCircle: XCircle,
  Clock: Clock,
  Send: Send,
  Zap: Zap,
  Wallet: Wallet,
  Money: DollarSign,
  Lock: Lock,
  Close: XCircle,
  Pending: Clock,
  Telegram: Send,
  Buy: ShoppingCart,
  Upload: Upload,
  Edit: Edit,
  ArrowRight: ArrowRight,
  Download: Download,
  Smartphone: Smartphone,
  Share2: Share2,
  MoreVertical: MoreVertical
};