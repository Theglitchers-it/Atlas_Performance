/**
 * Costanti condivise per UI gamification:
 * - RARITY_META: lookup per badge rarity (color/border/gradient/label)
 * - TX_TYPE_META: lookup per transaction_type (label/emoji/color)
 *
 * Usate da: GamHeroCard, GamNextAchievementCard, GamAchievementGrid,
 * GamActivityTimeline e GamificationView.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface RarityMeta {
    color: string       // text color tailwind class
    bg: string          // background tailwind class
    border: string      // border tailwind class
    gradient: string    // bg-gradient-to-br child classes
    label: string       // italian label
}

export const RARITY_META: Record<Rarity, RarityMeta> = {
    common: {
        color: 'text-gray-300',
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30',
        gradient: 'from-gray-500/10 to-transparent',
        label: 'Comune'
    },
    uncommon: {
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/40',
        gradient: 'from-green-500/20 to-transparent',
        label: 'Non Comune'
    },
    rare: {
        color: 'text-blue-400',
        bg: 'bg-blue-500/20',
        border: 'border-blue-500/40',
        gradient: 'from-blue-500/20 to-transparent',
        label: 'Raro'
    },
    epic: {
        color: 'text-purple-400',
        bg: 'bg-purple-500/20',
        border: 'border-purple-500/40',
        gradient: 'from-purple-500/25 to-transparent',
        label: 'Epico'
    },
    legendary: {
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/40',
        gradient: 'from-yellow-500/30 to-orange-500/10',
        label: 'Leggendario'
    }
}

export const getRarityMeta = (r: string | null | undefined): RarityMeta =>
    RARITY_META[(r as Rarity)] || RARITY_META.common

export interface TxTypeMeta {
    label: string
    emoji: string
    color: string  // tailwind bg-* class
}

export const TX_TYPE_META: Record<string, TxTypeMeta> = {
    workout: { label: 'Allenamento', emoji: '💪', color: 'bg-cyan-500' },
    checkin: { label: 'Check-in', emoji: '✅', color: 'bg-green-500' },
    achievement: { label: 'Achievement', emoji: '🏆', color: 'bg-yellow-500' },
    challenge: { label: 'Sfida', emoji: '🎯', color: 'bg-purple-500' },
    streak: { label: 'Serie', emoji: '🔥', color: 'bg-orange-500' },
    bonus: { label: 'Bonus', emoji: '🎁', color: 'bg-pink-500' },
    admin: { label: 'Admin', emoji: '⚙️', color: 'bg-gray-500' }
}

export const getTxTypeMeta = (t: string | null | undefined): TxTypeMeta =>
    TX_TYPE_META[t || 'workout'] || TX_TYPE_META.workout
