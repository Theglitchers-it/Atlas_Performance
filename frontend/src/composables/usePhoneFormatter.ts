/**
 * Phone formatter helpers (Fase 9 quick actions).
 * Default country: Italia.
 */

export function formatPhoneInternational(phone: string | null | undefined, defaultPrefix = '39'): string | null {
    if (!phone) return null
    // Strip tutto tranne digits e +
    let cleaned = phone.replace(/[^\d+]/g, '')
    if (cleaned.startsWith('00')) cleaned = '+' + cleaned.substring(2)
    if (cleaned.startsWith('+')) return cleaned.substring(1) // wa.me vuole senza '+'
    // Se inizia con il prefisso senza '+'
    if (cleaned.length >= 11 && cleaned.startsWith(defaultPrefix)) return cleaned
    // Numero locale italiano: aggiunge 39
    return defaultPrefix + cleaned
}

export function formatPhoneDisplay(phone: string | null | undefined): string {
    if (!phone) return ''
    const digits = phone.replace(/[^\d]/g, '')
    if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    if (digits.length === 11 && digits.startsWith('3')) return `+39 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
    return phone
}

/**
 * Sostituisce {{nome}}, {{cognome}}, {{trainer_name}}, {{business_name}} nel template.
 */
export function fillTemplate(template: string, vars: Record<string, string | null | undefined>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}

export function buildWhatsAppUrl(phone: string | null | undefined, message: string): string | null {
    const intl = formatPhoneInternational(phone)
    if (!intl) return null
    return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`
}
