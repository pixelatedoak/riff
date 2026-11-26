import {
    ArrowLeft, ArrowUpRight, Bookmark, BookOpen, Check, ChevronLeft, ChevronRight, CircleHelp, Compass,
    CircleUserRound, FileText, Flag, Flame, GitFork, Heart, House, ImagePlus, Link2,
    LockKeyhole, Menu, MessageCircle, MoreHorizontal, Plus, Repeat2, Trash2, X, Bell,
    Rows3, Search, Settings2, Share2, ShieldAlert, Upload, UserRound, Palette,
    Reply, Send, Sticker, Clapperboard,
    type LucideIcon,
} from 'lucide-react'

export type IconName = 'branch' | 'lock' | 'feed' | 'explore' | 'profile' | 'plus' | 'heart' | 'comment' | 'message' | 'repost' | 'bookmark' | 'share' | 'flag' | 'flame' | 'settings' | 'more' | 'menu' | 'close' | 'trash' | 'link' | 'upload' | 'check' | 'search' | 'home' | 'arrow-left' | 'arrow-up-right' | 'chevron-left' | 'chevron-right' | 'file' | 'image' | 'sticker' | 'gif' | 'reply' | 'send' | 'help' | 'book' | 'moderation' | 'user' | 'bell' | 'palette'

const iconMap: Record<IconName, LucideIcon> = {
    branch: GitFork,
    lock: LockKeyhole,
    feed: Rows3,
    explore: Compass,
    profile: CircleUserRound,
    bell: Bell,
    palette: Palette,
    plus: Plus,
    heart: Heart,
    message: MessageCircle,
    comment: MessageCircle,
    repost: Repeat2,
    bookmark: Bookmark,
    share: Share2,
    flag: Flag,
    flame: Flame,
    settings: Settings2,
    more: MoreHorizontal,
    menu: Menu,
    close: X,
    trash: Trash2,
    link: Link2,
    upload: Upload,
    check: Check,
    search: Search,
    home: House,
    'arrow-left': ArrowLeft,
    'arrow-up-right': ArrowUpRight,
    'chevron-left': ChevronLeft,
    'chevron-right': ChevronRight,
    sticker: Sticker,
    gif: Clapperboard,
    reply: Reply,
    send: Send,
    file: FileText,
    image: ImagePlus,
    help: CircleHelp,
    book: BookOpen,
    moderation: ShieldAlert,
    user: UserRound,
}

export function Icon({ name, size = 18, strokeWidth = 1.8, className }: { name: IconName; size?: number; strokeWidth?: number; className?: string }) {
    const LucideIcon = iconMap[name] ?? CircleHelp
    return <LucideIcon aria-hidden="true" size={size} strokeWidth={strokeWidth} className={className} />
}
