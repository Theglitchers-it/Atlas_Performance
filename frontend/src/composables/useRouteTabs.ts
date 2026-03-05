/**
 * useRouteTabs - Composable for tab navigation synced with route query params.
 * Used by UnifiedAnalyticsView, UnifiedProgramsView, UnifiedAdminView, UnifiedMonitoringView.
 */

import { shallowRef, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export interface TabDefinition {
    readonly key: string
    readonly label: string
    readonly icon: Component
}

export function useRouteTabs<T extends readonly TabDefinition[]>(
    tabs: T,
    basePath: string,
    defaultTab: T[number]['key']
) {
    const route = useRoute()
    const router = useRouter()

    type TabKey = T[number]['key']

    const isValidTab = (val: unknown): val is TabKey =>
        typeof val === 'string' && tabs.some(t => t.key === val)

    const activeTab = shallowRef<TabKey>(
        isValidTab(route.query.tab) ? (route.query.tab as TabKey) : defaultTab
    )

    watch(
        () => route.query.tab,
        (val) => {
            if (isValidTab(val)) {
                activeTab.value = val
            }
        },
    )

    const switchTab = (key: TabKey) => {
        activeTab.value = key
        router.replace({
            path: basePath,
            query: key === defaultTab ? {} : { tab: key },
        })
    }

    return { activeTab, switchTab }
}
