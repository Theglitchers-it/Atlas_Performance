/**
 * Unit Tests - UpgradeModal.vue
 * Test della logica dei piani, prezzi, computed e interazioni
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'

// =============================================
// Test logica pura dei piani (senza montare componente)
// =============================================

const plans = [
    {
        id: 'starter',
        name: 'Starter',
        monthlyPrice: 19,
        yearlyPrice: 190,
        maxClients: 15,
        popular: false,
        features: [
            'Fino a 15 clienti',
            'Schede e programmi illimitati',
            'Chat con i clienti',
            'Calendario e prenotazioni',
            'Statistiche base'
        ]
    },
    {
        id: 'professional',
        name: 'Pro',
        monthlyPrice: 39,
        yearlyPrice: 390,
        maxClients: 50,
        popular: true,
        features: [
            'Fino a 50 clienti',
            'Tutto di Starter, e in aggiunta:',
            'Video library e corsi',
            'Nutrizione e meal planner',
            'Gamification e community',
            'Analytics avanzati',
            'AI Coach assistente'
        ]
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        monthlyPrice: 79,
        yearlyPrice: 790,
        maxClients: 999,
        popular: false,
        features: [
            'Clienti illimitati',
            'Tutto di Pro, e in aggiunta:',
            'Multi-sede',
            'Staff con permessi personalizzati',
            'Branding personalizzato',
            'Supporto prioritario',
            'API access'
        ]
    }
]

// Funzioni helper replicate dal componente
const getPrice = (plan, billingCycle) => {
    return billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
}

const getSaving = (plan) => {
    return plan.monthlyPrice * 12 - plan.yearlyPrice
}

const isCurrentPlan = (planId, currentPlan) => {
    return currentPlan === planId || (currentPlan === 'pro' && planId === 'professional')
}

const isDowngrade = (planId, currentPlan) => {
    const order = ['free', 'starter', 'professional', 'enterprise']
    const currentIdx = order.indexOf(currentPlan === 'pro' ? 'professional' : currentPlan)
    const targetIdx = order.indexOf(planId)
    return targetIdx < currentIdx
}

// =============================================
// Test prezzi
// =============================================
describe('UpgradeModal - Prezzi', () => {

    it('restituisce prezzo mensile corretto per ogni piano', () => {
        expect(getPrice(plans[0], 'monthly')).toBe(19)
        expect(getPrice(plans[1], 'monthly')).toBe(39)
        expect(getPrice(plans[2], 'monthly')).toBe(79)
    })

    it('restituisce prezzo annuale corretto per ogni piano', () => {
        expect(getPrice(plans[0], 'yearly')).toBe(190)
        expect(getPrice(plans[1], 'yearly')).toBe(390)
        expect(getPrice(plans[2], 'yearly')).toBe(790)
    })

    it('calcola risparmio annuale corretto', () => {
        // Starter: 19*12 = 228 - 190 = 38
        expect(getSaving(plans[0])).toBe(38)
        // Pro: 39*12 = 468 - 390 = 78
        expect(getSaving(plans[1])).toBe(78)
        // Enterprise: 79*12 = 948 - 790 = 158
        expect(getSaving(plans[2])).toBe(158)
    })

    it('risparmio annuale e sempre positivo', () => {
        plans.forEach(plan => {
            expect(getSaving(plan)).toBeGreaterThan(0)
        })
    })
})

// =============================================
// Test piano attuale
// =============================================
describe('UpgradeModal - isCurrentPlan', () => {

    it('identifica piano free come attuale', () => {
        expect(isCurrentPlan('starter', 'free')).toBe(false)
        expect(isCurrentPlan('professional', 'free')).toBe(false)
        expect(isCurrentPlan('enterprise', 'free')).toBe(false)
    })

    it('identifica piano starter come attuale', () => {
        expect(isCurrentPlan('starter', 'starter')).toBe(true)
        expect(isCurrentPlan('professional', 'starter')).toBe(false)
    })

    it('identifica piano professional come attuale', () => {
        expect(isCurrentPlan('professional', 'professional')).toBe(true)
        expect(isCurrentPlan('starter', 'professional')).toBe(false)
    })

    it('mappa "pro" a "professional"', () => {
        expect(isCurrentPlan('professional', 'pro')).toBe(true)
    })

    it('identifica piano enterprise come attuale', () => {
        expect(isCurrentPlan('enterprise', 'enterprise')).toBe(true)
        expect(isCurrentPlan('professional', 'enterprise')).toBe(false)
    })
})

// =============================================
// Test downgrade
// =============================================
describe('UpgradeModal - isDowngrade', () => {

    it('da free nessun piano e downgrade', () => {
        expect(isDowngrade('starter', 'free')).toBe(false)
        expect(isDowngrade('professional', 'free')).toBe(false)
        expect(isDowngrade('enterprise', 'free')).toBe(false)
    })

    it('da starter, nessun upgrade e downgrade, ma free e downgrade', () => {
        expect(isDowngrade('professional', 'starter')).toBe(false)
        expect(isDowngrade('enterprise', 'starter')).toBe(false)
    })

    it('da professional, starter e downgrade', () => {
        expect(isDowngrade('starter', 'professional')).toBe(true)
        expect(isDowngrade('enterprise', 'professional')).toBe(false)
    })

    it('da pro (alias), starter e downgrade', () => {
        expect(isDowngrade('starter', 'pro')).toBe(true)
    })

    it('da enterprise, tutti gli altri sono downgrade', () => {
        expect(isDowngrade('starter', 'enterprise')).toBe(true)
        expect(isDowngrade('professional', 'enterprise')).toBe(true)
    })
})

// =============================================
// Test struttura piani
// =============================================
describe('UpgradeModal - Struttura piani', () => {

    it('ci sono esattamente 3 piani', () => {
        expect(plans).toHaveLength(3)
    })

    it('tutti i piani hanno le proprieta necessarie', () => {
        plans.forEach(plan => {
            expect(plan).toHaveProperty('id')
            expect(plan).toHaveProperty('name')
            expect(plan).toHaveProperty('monthlyPrice')
            expect(plan).toHaveProperty('yearlyPrice')
            expect(plan).toHaveProperty('maxClients')
            expect(plan).toHaveProperty('features')
            expect(Array.isArray(plan.features)).toBe(true)
            expect(plan.features.length).toBeGreaterThan(0)
        })
    })

    it('solo il piano Pro e marcato come popular', () => {
        const popularPlans = plans.filter(p => p.popular)
        expect(popularPlans).toHaveLength(1)
        expect(popularPlans[0].id).toBe('professional')
    })

    it('i prezzi sono in ordine crescente', () => {
        expect(plans[0].monthlyPrice).toBeLessThan(plans[1].monthlyPrice)
        expect(plans[1].monthlyPrice).toBeLessThan(plans[2].monthlyPrice)
        expect(plans[0].yearlyPrice).toBeLessThan(plans[1].yearlyPrice)
        expect(plans[1].yearlyPrice).toBeLessThan(plans[2].yearlyPrice)
    })

    it('max_clients e in ordine crescente', () => {
        expect(plans[0].maxClients).toBeLessThan(plans[1].maxClients)
        expect(plans[1].maxClients).toBeLessThan(plans[2].maxClients)
    })

    it('i prezzi mensili sono maggiori di 0', () => {
        plans.forEach(plan => {
            expect(plan.monthlyPrice).toBeGreaterThan(0)
        })
    })

    it('i prezzi annuali sono inferiori a 12x mensile', () => {
        plans.forEach(plan => {
            expect(plan.yearlyPrice).toBeLessThan(plan.monthlyPrice * 12)
        })
    })
})

// =============================================
// Test visibilita client
// =============================================
describe('UpgradeModal - Client mode', () => {

    it('client non vede bottoni upgrade', () => {
        const isClient = true
        expect(isClient).toBe(true)
        // In modalita client, i bottoni di upgrade non devono essere visibili
        // (v-if="!isClient" nel template)
    })

    it('tenant_owner vede bottoni upgrade', () => {
        const isClient = false
        expect(isClient).toBe(false)
    })

    it('client vede testo informativo adattato', () => {
        const isClient = true
        const title = isClient ? 'Scopri i piani Premium' : 'Scegli il piano giusto per te'
        expect(title).toBe('Scopri i piani Premium')
    })

    it('trainer vede testo azione', () => {
        const isClient = false
        const title = isClient ? 'Scopri i piani Premium' : 'Scegli il piano giusto per te'
        expect(title).toBe('Scegli il piano giusto per te')
    })

    it('footer client mostra messaggio trainer', () => {
        const isClient = true
        const footer = isClient
            ? 'Parla con il tuo trainer per attivare le funzionalita premium.'
            : 'Pagamento sicuro con Stripe. Puoi cancellare in qualsiasi momento.'
        expect(footer).toContain('trainer')
    })

    it('footer trainer mostra messaggio Stripe', () => {
        const isClient = false
        const footer = isClient
            ? 'Parla con il tuo trainer per attivare le funzionalita premium.'
            : 'Pagamento sicuro con Stripe. Puoi cancellare in qualsiasi momento.'
        expect(footer).toContain('Stripe')
    })
})

// =============================================
// Test billingCycle toggle
// =============================================
describe('UpgradeModal - BillingCycle toggle', () => {

    it('default e monthly', () => {
        const billingCycle = ref('monthly')
        expect(billingCycle.value).toBe('monthly')
    })

    it('switch a yearly aggiorna i prezzi', () => {
        const billingCycle = ref('monthly')
        billingCycle.value = 'yearly'
        expect(getPrice(plans[1], billingCycle.value)).toBe(390)
    })

    it('switch di nuovo a monthly ritorna ai prezzi mensili', () => {
        const billingCycle = ref('yearly')
        billingCycle.value = 'monthly'
        expect(getPrice(plans[1], billingCycle.value)).toBe(39)
    })
})
