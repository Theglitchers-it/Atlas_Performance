/**
 * Unit Tests - showUpgradeCard (AppSidebar logic)
 * Test della computed che determina la visibilita del bottone "Passa a Pro"
 */

import { describe, it, expect } from 'vitest'

/**
 * Replica la logica di showUpgradeCard da AppSidebar.vue
 * Mostra card upgrade: per tenant_owner su piano free/starter, e per tutti i client
 */
const showUpgradeCard = (userRole, subscriptionPlan) => {
    if (userRole === 'super_admin') return false
    if (userRole === 'client') return true
    const plan = subscriptionPlan || 'free'
    return userRole === 'tenant_owner' && ['free', 'starter'].includes(plan)
}

// =============================================
// Visibilita per ruolo
// =============================================
describe('showUpgradeCard - Per ruolo', () => {

    it('client vede sempre il bottone upgrade', () => {
        expect(showUpgradeCard('client', undefined)).toBe(true)
        expect(showUpgradeCard('client', 'free')).toBe(true)
        expect(showUpgradeCard('client', 'professional')).toBe(true)
    })

    it('super_admin non vede mai il bottone upgrade', () => {
        expect(showUpgradeCard('super_admin', 'free')).toBe(false)
        expect(showUpgradeCard('super_admin', undefined)).toBe(false)
    })

    it('staff non vede il bottone upgrade', () => {
        expect(showUpgradeCard('staff', 'free')).toBe(false)
        expect(showUpgradeCard('staff', 'starter')).toBe(false)
    })
})

// =============================================
// Visibilita per piano (tenant_owner)
// =============================================
describe('showUpgradeCard - tenant_owner per piano', () => {

    it('piano free: mostra upgrade', () => {
        expect(showUpgradeCard('tenant_owner', 'free')).toBe(true)
    })

    it('piano starter: mostra upgrade', () => {
        expect(showUpgradeCard('tenant_owner', 'starter')).toBe(true)
    })

    it('piano professional: nasconde upgrade', () => {
        expect(showUpgradeCard('tenant_owner', 'professional')).toBe(false)
    })

    it('piano pro (alias): nasconde upgrade', () => {
        // "pro" non e in ['free','starter'] quindi viene nascosto
        expect(showUpgradeCard('tenant_owner', 'pro')).toBe(false)
    })

    it('piano enterprise: nasconde upgrade', () => {
        expect(showUpgradeCard('tenant_owner', 'enterprise')).toBe(false)
    })

    it('piano undefined (default free): mostra upgrade', () => {
        expect(showUpgradeCard('tenant_owner', undefined)).toBe(true)
    })

    it('piano null (default free): mostra upgrade', () => {
        expect(showUpgradeCard('tenant_owner', null)).toBe(true)
    })
})

// =============================================
// Matrice completa
// =============================================
describe('showUpgradeCard - Matrice completa ruoli x piani', () => {
    const cases = [
        // [ruolo, piano, atteso]
        ['client', 'free', true],
        ['client', 'starter', true],
        ['client', 'professional', true],
        ['client', 'enterprise', true],
        ['tenant_owner', 'free', true],
        ['tenant_owner', 'starter', true],
        ['tenant_owner', 'professional', false],
        ['tenant_owner', 'enterprise', false],
        ['staff', 'free', false],
        ['staff', 'starter', false],
        ['staff', 'professional', false],
        ['super_admin', 'free', false],
        ['super_admin', 'professional', false],
    ]

    it.each(cases)(
        'ruolo=%s piano=%s -> visibile=%s',
        (role, plan, expected) => {
            expect(showUpgradeCard(role, plan)).toBe(expected)
        }
    )
})
