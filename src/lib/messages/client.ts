'use client'

import { createClient } from '@/lib/supabase/client'

export async function getOrCreateConversation(currentUserId: string, otherUserId: string) {
    if (currentUserId === otherUserId) throw new Error('You cannot message yourself.')
    const supabase = createClient()
    const [user_one, user_two] = currentUserId < otherUserId
        ? [currentUserId, otherUserId]
        : [otherUserId, currentUserId]

    const { data: created, error } = await supabase.from('riff_conversations')
        .insert({ user_one, user_two, created_by: currentUserId })
        .select('id')
        .maybeSingle()
    if (created) return created.id as string
    if (error?.code === '42P01' || error?.code === 'PGRST205') throw new Error('Messaging needs setup. Run supabase/riff-messaging.sql in your Supabase SQL Editor.')

    // A second tab may have created the unique pair at the same time.
    const { data: existing, error: lookupError } = await supabase.from('riff_conversations')
        .select('id')
        .eq('user_one', user_one)
        .eq('user_two', user_two)
        .maybeSingle()
    if (existing) return existing.id as string
    if (lookupError?.code === '42P01' || lookupError?.code === 'PGRST205') throw new Error('Messaging needs setup. Run supabase/riff-messaging.sql in your Supabase SQL Editor.')
    if (lookupError) throw new Error(lookupError.message)
    throw new Error(error?.message ?? 'Could not start this conversation.')
}
