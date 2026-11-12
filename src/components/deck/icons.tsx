import {
  AlertTriangle,
  BookOpen,
  Building2,
  CalendarCheck,
  ChartColumn,
  CircleCheck,
  Clock,
  Coins,
  Compass,
  Database,
  Eye,
  Flag,
  Gauge,
  Globe,
  GraduationCap,
  Handshake,
  Heart,
  Layers,
  LayoutGrid,
  Leaf,
  Lightbulb,
  Map,
  Megaphone,
  MessageCircle,
  Monitor,
  Puzzle,
  RefreshCw,
  Rocket,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { Icon } from "@/domain/story";

/** The drawing for each icon a story may name (domain/story ICONS). */
const DRAWINGS: Record<Icon, LucideIcon> = {
  users: Users,
  "user-check": UserCheck,
  handshake: Handshake,
  "message-circle": MessageCircle,
  megaphone: Megaphone,
  target: Target,
  compass: Compass,
  map: Map,
  flag: Flag,
  rocket: Rocket,
  "trending-up": TrendingUp,
  chart: ChartColumn,
  gauge: Gauge,
  clock: Clock,
  calendar: CalendarCheck,
  layers: Layers,
  layout: LayoutGrid,
  puzzle: Puzzle,
  settings: Settings,
  wrench: Wrench,
  shield: ShieldCheck,
  scale: Scale,
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  heart: Heart,
  graduation: GraduationCap,
  book: BookOpen,
  search: Search,
  eye: Eye,
  alert: AlertTriangle,
  check: CircleCheck,
  refresh: RefreshCw,
  workflow: Workflow,
  database: Database,
  monitor: Monitor,
  coins: Coins,
  leaf: Leaf,
  building: Building2,
  globe: Globe,
  star: Star,
};

export function DeckIcon({
  icon,
  size,
  className,
  style,
}: {
  icon: Icon;
  size: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Drawing = DRAWINGS[icon] ?? Target;
  return (
    <Drawing
      aria-hidden
      className={className}
      strokeWidth={1.6}
      style={{ width: size, height: size, flex: "none", ...style }}
    />
  );
}
