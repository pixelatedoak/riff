import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BottomNavigation } from '@/app/bottom-navigation'
import { NotificationInbox, type NotificationItem } from '@/app/notifications/notification-inbox'
import { Icon } from '@/components/icon'
import { createClient } from '@/lib/supabase/server'

const typeLabels: Record<NotificationItem['type'], string> = {
    like: 'liked your Riff',
    comment: 'commented on your Riff',
    repost: 'reposted your Riff',
    follow: 'followed you',
    branch: 'riffed off your Riff',
    new_riff: 'posted a new Riff',
}

export default async function NotificationsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/auth/login')

    const { data, error } = await supabase.from('riff_notifications')
        .select('id, actor_id, type, source_id, riff_id, created_at, read_at')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

    const setupError = Boolean(error && (error.code === '42P01' || error.code === 'PGRST205'))
    const notifications = data ?? []
    const actorIds = [...new Set(notifications.map((item) => item.actor_id))]
    const riffIds = [...new Set(notifications.map((item) => item.riff_id).filter((id): id is string => Boolean(id)))]
    const commentIds = notifications.filter((item) => item.type === 'comment').map((item) => item.source_id)
    const [{ data: profiles }, { data: riffs }, { data: comments }] = await Promise.all([
        actorIds.length ? supabase.from('profiles').select('id, username, full_name').in('id', actorIds) : Promise.resolve({ data: [] }),
        riffIds.length ? supabase.from('riffs').select('id, content, deleted_at').in('id', riffIds) : Promise.resolve({ data: [] }),
        commentIds.length ? supabase.from('riff_comments').select('id, content').in('id', commentIds) : Promise.resolve({ data: [] }),
    ])
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
    const riffMap = new Map((riffs ?? []).map((riff) => [riff.id, riff]))
    const commentMap = new Map((comments ?? []).map((comment) => [comment.id, comment.content]))
    const items: NotificationItem[] = notifications.map((notification) => {
        const profile = profileMap.get(notification.actor_id)
        const riff = notification.riff_id ? riffMap.get(notification.riff_id) : null
        const excerpt = notification.type === 'comment'
            ? commentMap.get(notification.source_id)
            : riff?.content
        const href = notification.type === 'follow' && profile?.username
            ? `/u/${profile.username}`
            : notification.riff_id ? `/r/${notification.riff_id}` : '/notifications'
        return {
            id: notification.id,
            type: notification.type as NotificationItem['type'],
            actorName: profile?.full_name || (profile?.username ? `@${profile.username}` : 'A Riff user'),
            actorUsername: profile?.username ? `@${profile.username}` : null,
            action: typeLabels[notification.type as NotificationItem['type']] ?? 'interacted with you',
            excerpt: excerpt && excerpt.length > 140 ? `${excerpt.slice(0, 137).trimEnd()}…` : excerpt ?? null,
            createdAt: notification.created_at,
            readAt: notification.read_at,
            href,
        }
    })

    return <main className="min-h-dvh bg-transparent px-4 pb-28 pt-8 text-riff-text sm:px-6">
        <section className="mx-auto w-full max-w-2xl">
            <header className="mb-6 flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl border border-riff-outline bg-riff-surface"><Icon name="bell" size={20} /></span>
                <div><p className="text-xs font-medium uppercase tracking-[0.2em] text-riff-muted">Your activity</p><h1 className="text-2xl font-semibold tracking-tight">Notifications</h1></div>
            </header>
            {setupError ? <div className="rounded-2xl border border-riff-outline bg-riff-surface p-5 text-sm text-riff-muted">
                <p className="font-medium text-riff-text">Notifications need one setup step</p>
                <p className="mt-2">Run the notifications SQL in your Supabase project, then reload this page.</p>
                <Link href="/" className="mt-4 inline-flex text-riff-accent underline underline-offset-4">Back to feed</Link>
            </div> : <NotificationInbox items={items} userId={user.id} />}
        </section>
        <BottomNavigation active="notifications" />
    </main>
}
