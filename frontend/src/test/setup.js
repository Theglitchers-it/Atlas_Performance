/**
 * Vitest Global Setup
 * Provides mocks for Capacitor plugins, localStorage, and browser APIs
 */

import { vi } from 'vitest'

// Ensure localStorage is available (jsdom provides it, but we reset between tests)
const localStorageMock = (() => {
    let store = {}
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = String(value) }),
        removeItem: vi.fn((key) => { delete store[key] }),
        clear: vi.fn(() => { store = {} }),
        get length() { return Object.keys(store).length },
        key: vi.fn((i) => Object.keys(store)[i] || null)
    }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock navigator.onLine (default: true)
Object.defineProperty(navigator, 'onLine', {
    writable: true,
    value: true
})

// Ensure Capacitor is NOT on window by default (web mode)
// Individual tests can set window.Capacitor when they need native behavior
if (!window.Capacitor) {
    window.Capacitor = undefined
}

// Mock CustomEvent if not available
if (typeof CustomEvent !== 'function') {
    window.CustomEvent = class CustomEvent extends Event {
        constructor(event, params = {}) {
            super(event, params)
            this.detail = params.detail || null
        }
    }
}

// import.meta.env.DEV is automatically set by Vitest based on the mode
