/**
 * useRouteTabs - Composable for tab navigation synced with route query params.
 * Used by UnifiedAnalyticsView, UnifiedProgramsView, UnifiedAdminView, UnifiedMonitoringView.
 */

import { shallowRef, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface TabDefinition {
    readonly key: string
    readonly label: string
    readonly icon: Component | string
}

export function useRouteTabs<T extends readonly TabDefinition[]>(
    tabs: T,
    basePath: string,
    defaultTab: T[number]['key'],
    queryKey: string = 'tab'
) {
    const route = useRoute()
    const router = useRouter()

    type TabKey = T[number]['key']

    const isValidTab = (val: unknown): val is TabKey =>
        typeof val === 'string' && tabs.some(t => t.key === val)

    const activeTab = shallowRef<TabKey>(
        isValidTab(route.query[queryKey]) ? (route.query[queryKey] as TabKey) : defaultTab
    )

    watch(
        () => route.query[queryKey],
        (val) => {
            if (isValidTab(val)) {
                activeTab.value = val
            } else if (val === undefined) {
                activeTab.value = defaultTab
            }
        },
    )

    const switchTab = (key: string) => {
        if (!isValidTab(key)) return
        activeTab.value = key
        const nextQuery: Record<string, any> = { ...route.query }
        if (key === defaultTab) {
            delete nextQuery[queryKey]
        } else {
            nextQuery[queryKey] = key
        }
        router.replace({ path: basePath, query: nextQuery })
    }

    return { activeTab, switchTab }
}
