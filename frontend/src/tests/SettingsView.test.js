/**
 * Unit Tests - SettingsView (logica upgrade e subscription)
 * Test delle computed e funzioni legate a piano, stato, e ritorno da Stripe
 */

import { describe, it, expect } from 'vitest'

// =============================================
// canUpgrade - logica visibilità bottone upgrade
// =============================================

const canUpgrade = (role, subscriptionPlan) => {
    const plan = subscriptionPlan || 'free'
    return role === 'tenant_owner' && ['free', 'starter'].includes(plan)
}

describe('SettingsView - canUpgrade', () => {

    it('tenant_owner su piano free può fare upgrade', () => {
        expect(canUpgrade('tenant_owner', 'free')).toBe(true)
    })

    it('tenant_owner su piano starter può fare upgrade', () => {
        expect(canUpgrade('tenant_owner', 'starter')).toBe(true)
    })

    it('tenant_owner su piano professional NON può fare upgrade', () => {
        expect(canUpgrade('tenant_owner', 'professional')).toBe(false)
    })

    it('tenant_owner su piano enterprise NON può fare upgrade', () => {
        expect(canUpgrade('tenant_owner', 'enterprise')).toBe(false)
    })

    it('tenant_owner senza piano (default free) può fare upgrade', () => {
        expect(canUpgrade('tenant_owner', undefined)).toBe(true)
        expect(canUpgrade('tenant_owner', null)).toBe(true)
    })

    it('client NON può fare upgrade (non è tenant_owner)', () => {
        expect(canUpgrade('client', 'free')).toBe(false)
        expect(canUpgrade('client', 'starter')).toBe(false)
    })

    it('staff NON può fare upgrade', () => {
        expect(canUpgrade('staff', 'free')).toBe(false)
    })

    it('super_admin NON può fare upgrade', () => {
        expect(canUpgrade('super_admin', 'free')).toBe(false)
    })
})

// =============================================
// planLabel - etichetta leggibile del piano
// =============================================

const planLabel = (subscriptionPlan) => {
    const labels = {
        free: 'Gratuito',
        starter: 'Starter',
        professional: 'Pro',
        pro: 'Pro',
        enterprise: 'Enterprise'
    }
    return labels[subscriptionPlan] || subscriptionPlan || 'Gratuito'
}

describe('SettingsView - planLabel', () => {

    it('free -> Gratuito', () => {
        expect(planLabel('free')).toBe('Gratuito')
    })

    it('starter -> Starter', () => {
        expect(planLabel('starter')).toBe('Starter')
    })

    it('professional -> Pro', () => {
        expect(planLabel('professional')).toBe('Pro')
    })

    it('pro -> Pro (alias)', () => {
        expect(planLabel('pro')).toBe('Pro')
    })

    it('enterprise -> Enterprise', () => {
        expect(planLabel('enterprise')).toBe('Enterprise')
    })

    it('undefined -> Gratuito (default)', () => {
        expect(planLabel(undefined)).toBe('Gratuito')
    })

    it('null -> Gratuito (default)', () => {
        expect(planLabel(null)).toBe('Gratuito')
    })

    it('valore sconosciuto -> restituisce il valore stesso', () => {
        expect(planLabel('custom_plan')).toBe('custom_plan')
    })
})

// =============================================
// planBadgeClass - classe CSS per badge piano
// =============================================

const planBadgeClass = (subscriptionPlan) => {
    const classes = {
        free: 'bg-gray-500/15 text-habit-text-subtle',
        starter: 'bg-blue-500/15 text-blue-400',
        professional: 'bg-habit-cyan/15 text-habit-cyan',
        pro: 'bg-habit-cyan/15 text-habit-cyan',
        enterprise: 'bg-purple-500/15 text-purple-400'
    }
    return classes[subscriptionPlan] || 'bg-gray-500/15 text-habit-text-subtle'
}

describe('SettingsView - planBadgeClass', () => {

    it('free ha classe gray', () => {
        expect(planBadgeClass('free')).toContain('gray-500')
    })

    it('starter ha classe blue', () => {
        expect(planBadgeClass('starter')).toContain('blue-500')
    })

    it('professional ha classe cyan', () => {
        expect(planBadgeClass('professional')).toContain('habit-cyan')
    })

    it('pro ha classe cyan (alias)', () => {
        expect(planBadgeClass('pro')).toContain('habit-cyan')
    })

    it('enterprise ha classe purple', () => {
        expect(planBadgeClass('enterprise')).toContain('purple-500')
    })

    it('piano sconosciuto ha classe default gray', () => {
        expect(planBadgeClass('unknown')).toContain('gray-500')
    })

    it('undefined ha classe default gray', () => {
        expect(planBadgeClass(undefined)).toContain('gray-500')
    })
})

// =============================================
// statusLabel - etichetta stato abbonamento
// =============================================

const statusLabel = (subscriptionStatus) => {
    const labels = {
        active: 'Attivo',
        trial: 'Prova',
        past_due: 'Scaduto',
        cancelled: 'Cancellato'
    }
    return labels[subscriptionStatus] || subscriptionStatus || 'Prova'
}

describe('SettingsView - statusLabel', () => {

    it('active -> Attivo', () => {
        expect(statusLabel('active')).toBe('Attivo')
    })

    it('trial -> Prova', () => {
        expect(statusLabel('trial')).toBe('Prova')
    })

    it('past_due -> Scaduto', () => {
        expect(statusLabel('past_due')).toBe('Scaduto')
    })

    it('cancelled -> Cancellato', () => {
        expect(statusLabel('cancelled')).toBe('Cancellato')
    })

    it('undefined -> Prova (default)', () => {
        expect(statusLabel(undefined)).toBe('Prova')
    })

    it('null -> Prova (default)', () => {
        expect(statusLabel(null)).toBe('Prova')
    })
})

// =============================================
// statusBadgeClass - classe CSS per badge stato
// =============================================

const statusBadgeClass = (subscriptionStatus) => {
    const classes = {
        active: 'bg-emerald-500/15 text-emerald-400',
        trial: 'bg-yellow-500/15 text-yellow-400',
        past_due: 'bg-red-500/15 text-red-400',
        cancelled: 'bg-red-500/15 text-red-400'
    }
    return classes[subscriptionStatus] || 'bg-yellow-500/15 text-yellow-400'
}

describe('SettingsView - statusBadgeClass', () => {

    it('active ha classe emerald', () => {
        expect(statusBadgeClass('active')).toContain('emerald')
    })

    it('trial ha classe yellow', () => {
        expect(statusBadgeClass('trial')).toContain('yellow')
    })

    it('past_due ha classe red', () => {
        expect(statusBadgeClass('past_due')).toContain('red')
    })

    it('cancelled ha classe red', () => {
        expect(statusBadgeClass('cancelled')).toContain('red')
    })

    it('stato sconosciuto ha classe default yellow', () => {
        expect(statusBadgeClass('unknown')).toContain('yellow')
    })
})

// =============================================
// roleLabel - etichetta ruolo
// =============================================

const roleLabel = (role) => {
    const labels = {
        super_admin: 'Super Admin',
        tenant_owner: 'Titolare',
        staff: 'Collaboratore',
        client: 'Cliente'
    }
    return labels[role] || role
}

describe('SettingsView - roleLabel', () => {

    it('super_admin -> Super Admin', () => {
        expect(roleLabel('super_admin')).toBe('Super Admin')
    })

    it('tenant_owner -> Titolare', () => {
        expect(roleLabel('tenant_owner')).toBe('Titolare')
    })

    it('staff -> Collaboratore', () => {
        expect(roleLabel('staff')).toBe('Collaboratore')
    })

    it('client -> Cliente', () => {
        expect(roleLabel('client')).toBe('Cliente')
    })

    it('ruolo sconosciuto restituisce il valore originale', () => {
        expect(roleLabel('manager')).toBe('manager')
    })
})

// =============================================
// roleBadgeClass - classe CSS per badge ruolo
// =============================================

const roleBadgeClass = (role) => {
    const classes = {
        super_admin: 'bg-purple-500/15 text-purple-400',
        tenant_owner: 'bg-habit-cyan/15 text-habit-cyan',
        staff: 'bg-blue-500/15 text-blue-400',
        client: 'bg-emerald-500/15 text-emerald-400'
    }
    return classes[role] || 'bg-gray-500/15 text-habit-text-subtle'
}

describe('SettingsView - roleBadgeClass', () => {

    it('super_admin ha classe purple', () => {
        expect(roleBadgeClass('super_admin')).toContain('purple')
    })

    it('tenant_owner ha classe cyan', () => {
        expect(roleBadgeClass('tenant_owner')).toContain('habit-cyan')
    })

    it('staff ha classe blue', () => {
        expect(roleBadgeClass('staff')).toContain('blue')
    })

    it('client ha classe emerald', () => {
        expect(roleBadgeClass('client')).toContain('emerald')
    })

    it('ruolo sconosciuto ha classe default gray', () => {
        expect(roleBadgeClass('unknown')).toContain('gray')
    })
})

// =============================================
// statusBadge (per membri team) - classe CSS
// =============================================

const memberStatusBadge = (status) => {
    if (status === 'active') return 'bg-emerald-500/15 text-emerald-400'
    if (status === 'pending') return 'bg-yellow-500/15 text-yellow-400'
    return 'bg-red-500/15 text-red-400'
}

describe('SettingsView - memberStatusBadge (team)', () => {

    it('active -> emerald', () => {
        expect(memberStatusBadge('active')).toContain('emerald')
    })

    it('pending -> yellow', () => {
        expect(memberStatusBadge('pending')).toContain('yellow')
    })

    it('inactive -> red', () => {
        expect(memberStatusBadge('inactive')).toContain('red')
    })

    it('suspended -> red', () => {
        expect(memberStatusBadge('suspended')).toContain('red')
    })

    it('qualsiasi altro stato -> red (default)', () => {
        expect(memberStatusBadge('unknown')).toContain('red')
    })
})

// =============================================
// memberStatusText - testo stato membro team
// =============================================

const memberStatusText = (status) => {
    const labels = {
        active: 'Attivo',
        inactive: 'Inattivo',
        pending: 'In attesa',
        suspended: 'Sospeso'
    }
    return labels[status] || status
}

describe('SettingsView - memberStatusText (team)', () => {

    it('active -> Attivo', () => {
        expect(memberStatusText('active')).toBe('Attivo')
    })

    it('inactive -> Inattivo', () => {
        expect(memberStatusText('inactive')).toBe('Inattivo')
    })

    it('pending -> In attesa', () => {
        expect(memberStatusText('pending')).toBe('In attesa')
    })

    it('suspended -> Sospeso', () => {
        expect(memberStatusText('suspended')).toBe('Sospeso')
    })

    it('stato sconosciuto restituisce il valore originale', () => {
        expect(memberStatusText('banned')).toBe('banned')
    })
})

// =============================================
// formatDate - formattazione data italiana
// =============================================

const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    })
}

describe('SettingsView - formatDate', () => {

    it('data valida formattata in italiano', () => {
        const result = formatDate('2024-06-15T10:30:00Z')
        // Il formato italiano è dd/mm/yyyy
        expect(result).toMatch(/15\/06\/2024/)
    })

    it('null -> trattino', () => {
        expect(formatDate(null)).toBe('-')
    })

    it('undefined -> trattino', () => {
        expect(formatDate(undefined)).toBe('-')
    })

    it('stringa vuota -> trattino', () => {
        expect(formatDate('')).toBe('-')
    })

    it('data ISO con timezone', () => {
        const result = formatDate('2023-01-01T00:00:00.000Z')
        expect(result).toContain('2023')
    })
})

// =============================================
// isTenantOwner - chi può vedere la sezione team
// =============================================

const isTenantOwner = (role) => {
    return role === 'tenant_owner' || role === 'super_admin'
}

describe('SettingsView - isTenantOwner (accesso team)', () => {

    it('tenant_owner vede la sezione team', () => {
        expect(isTenantOwner('tenant_owner')).toBe(true)
    })

    it('super_admin vede la sezione team', () => {
        expect(isTenantOwner('super_admin')).toBe(true)
    })

    it('client NON vede la sezione team', () => {
        expect(isTenantOwner('client')).toBe(false)
    })

    it('staff NON vede la sezione team', () => {
        expect(isTenantOwner('staff')).toBe(false)
    })
})

// =============================================
// Stripe callback query params handling
// =============================================

describe('SettingsView - Stripe callback handling', () => {

    const handleStripeCallback = (query) => {
        const result = { successMessage: '', errorMessage: '', shouldRefreshUser: false, shouldCleanUrl: false }

        if (query.upgrade === 'success') {
            result.successMessage = 'Upgrade completato con successo! Il tuo piano e stato aggiornato.'
            result.shouldRefreshUser = true
            result.shouldCleanUrl = true
        } else if (query.upgrade === 'cancelled') {
            result.errorMessage = 'Upgrade annullato. Puoi riprovare quando vuoi.'
            result.shouldCleanUrl = true
        }

        return result
    }

    it('upgrade=success mostra messaggio di successo', () => {
        const result = handleStripeCallback({ upgrade: 'success', plan: 'professional' })
        expect(result.successMessage).toContain('Upgrade completato')
        expect(result.errorMessage).toBe('')
    })

    it('upgrade=success richiede refresh dati utente', () => {
        const result = handleStripeCallback({ upgrade: 'success', plan: 'starter' })
        expect(result.shouldRefreshUser).toBe(true)
    })

    it('upgrade=success richiede pulizia URL', () => {
        const result = handleStripeCallback({ upgrade: 'success' })
        expect(result.shouldCleanUrl).toBe(true)
    })

    it('upgrade=cancelled mostra messaggio di errore', () => {
        const result = handleStripeCallback({ upgrade: 'cancelled' })
        expect(result.errorMessage).toContain('Upgrade annullato')
        expect(result.successMessage).toBe('')
    })

    it('upgrade=cancelled richiede pulizia URL', () => {
        const result = handleStripeCallback({ upgrade: 'cancelled' })
        expect(result.shouldCleanUrl).toBe(true)
    })

    it('upgrade=cancelled NON richiede refresh utente', () => {
        const result = handleStripeCallback({ upgrade: 'cancelled' })
        expect(result.shouldRefreshUser).toBe(false)
    })

    it('nessun parametro upgrade non fa nulla', () => {
        const result = handleStripeCallback({})
        expect(result.successMessage).toBe('')
        expect(result.errorMessage).toBe('')
        expect(result.shouldRefreshUser).toBe(false)
        expect(result.shouldCleanUrl).toBe(false)
    })

    it('parametro upgrade sconosciuto non fa nulla', () => {
        const result = handleStripeCallback({ upgrade: 'unknown' })
        expect(result.successMessage).toBe('')
        expect(result.errorMessage).toBe('')
    })
})

// =============================================
// Matrice completa canUpgrade
// =============================================

describe('SettingsView - canUpgrade matrice completa', () => {
    const cases = [
        // [ruolo, piano, atteso]
        ['tenant_owner', 'free', true],
        ['tenant_owner', 'starter', true],
        ['tenant_owner', 'professional', false],
        ['tenant_owner', 'enterprise', false],
        ['tenant_owner', undefined, true],
        ['tenant_owner', null, true],
        ['client', 'free', false],
        ['client', 'starter', false],
        ['client', 'professional', false],
        ['staff', 'free', false],
        ['staff', 'starter', false],
        ['super_admin', 'free', false],
        ['super_admin', 'professional', false],
    ]

    it.each(cases)(
        'ruolo=%s piano=%s -> canUpgrade=%s',
        (role, plan, expected) => {
            expect(canUpgrade(role, plan)).toBe(expected)
        }
    )
})
