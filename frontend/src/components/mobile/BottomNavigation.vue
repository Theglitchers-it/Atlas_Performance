<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/store/auth";
import { useChatStore } from "@/store/chat";
import { useNative } from "@/composables/useNative";
import {
  HomeIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  HeartIcon,
  UserIcon,
} from "@heroicons/vue/24/outline";
import {
  HomeIcon as HomeIconSolid,
  ClipboardDocumentListIcon as ClipboardSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  TrophyIcon as TrophySolid,
  HeartIcon as HeartSolid,
  UserIcon as UserSolid,
} from "@heroicons/vue/24/solid";

interface NavItem {
  name: string;
  path: string;
  icon: Component;
  iconActive: Component;
  isCenter?: boolean;
}

const route = useRoute();
const authStore = useAuthStore();
const chatStore = useChatStore();
const { hapticTap } = useNative();

const isClient = computed<boolean>(() => authStore.isClient);
const unreadCount = computed<number>(() => chatStore.totalUnread || 0);

// Bottom nav items per trainer
const trainerNav: NavItem[] = [
  { name: "Home", path: "/", icon: HomeIcon, iconActive: HomeIconSolid },
  {
    name: "Clienti",
    path: "/clients",
    icon: ClipboardDocumentListIcon,
    iconActive: ClipboardSolid,
  },
  {
    name: "Chat",
    path: "/chat",
    icon: ChatBubbleLeftRightIcon,
    iconActive: ChatSolid,
    isCenter: true,
  },
  {
    name: "Badge",
    path: "/gamification",
    icon: TrophyIcon,
    iconActive: TrophySolid,
  },
  { name: "Profilo", path: "/profile", icon: UserIcon, iconActive: UserSolid },
];

// Bottom nav items per client
const clientNav: NavItem[] = [
  {
    name: "Home",
    path: "/my-dashboard",
    icon: HomeIcon,
    iconActive: HomeIconSolid,
  },
  {
    name: "Check-in",
    path: "/checkin",
    icon: HeartIcon,
    iconActive: HeartSolid,
  },
  {
    name: "Chat",
    path: "/chat",
    icon: ChatBubbleLeftRightIcon,
    iconActive: ChatSolid,
    isCenter: true,
  },
  {
    name: "Workout",
    path: "/my-workout",
    icon: ClipboardDocumentListIcon,
    iconActive: ClipboardSolid,
  },
  { name: "Profilo", path: "/profile", icon: UserIcon, iconActive: UserSolid },
];

const navItems = computed<NavItem[]>(() =>
  isClient.value ? clientNav : trainerNav,
);

const isActive = (path: string): boolean => {
  if (path === "/" || path === "/my-dashboard") {
    return route.path === path;
  }
  return route.path.startsWith(path);
};
</script>

<template>
  <nav
    aria-label="Navigazione principale"
    class="fixed bottom-0 left-0 right-0 z-50 safe-bottom safe-left safe-right"
  >
    <div
      class="relative bg-habit-card/95 backdrop-blur-xl border-t border-habit-border/30 dark:border-transparent"
    >
      <div class="flex items-end justify-around px-2 pb-1 pt-1.5">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          :aria-label="item.name"
          @click="hapticTap"
          class="relative flex flex-col items-center justify-center min-w-[48px] min-h-[48px] px-1 transition-all duration-200"
          :class="{
            'text-habit-orange': isActive(item.path) && !item.isCenter,
            'text-habit-text-subtle': !isActive(item.path) && !item.isCenter,
            '-mt-4': item.isCenter,
          }"
        >
          <!-- Center item (Chat) — floating pill -->
          <template v-if="item.isCenter">
            <div
              class="relative flex items-center justify-center w-[52px] h-[52px] rounded-[18px] shadow-lg transition-all duration-300"
              :class="{
                'bg-habit-orange text-white shadow-habit-orange/30': isActive(
                  item.path,
                ),
                'bg-habit-bg-light dark:bg-habit-card-hover text-habit-orange':
                  !isActive(item.path),
              }"
            >
              <component
                :is="isActive(item.path) ? item.iconActive : item.icon"
                class="w-6 h-6 transition-transform duration-200"
                :class="{ 'scale-110': isActive(item.path) }"
              />
              <!-- Unread badge -->
              <span
                v-if="unreadCount > 0"
                aria-live="polite"
                :aria-label="`${unreadCount} messaggi non letti`"
                class="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] flex items-center justify-center rounded-full text-[10px] font-bold leading-none px-1 shadow-sm"
                :class="{
                  'bg-white text-habit-orange': isActive(item.path),
                  'bg-habit-orange text-white': !isActive(item.path),
                }"
              >
                {{ unreadCount > 99 ? "99+" : unreadCount }}
              </span>
            </div>
            <span
              class="text-[10px] mt-1 font-medium transition-colors duration-200"
              :class="{
                'text-habit-orange font-semibold': isActive(item.path),
                'text-habit-text-subtle': !isActive(item.path),
              }"
            >
              {{ item.name }}
            </span>
          </template>

          <!-- Normal items -->
          <template v-else>
            <!-- Active dot indicator -->
            <component
              :is="isActive(item.path) ? item.iconActive : item.icon"
              class="transition-all duration-200"
              :class="{
                'w-[23px] h-[23px]': isActive(item.path),
                'w-[21px] h-[21px]': !isActive(item.path),
              }"
            />
            <span
              class="text-[10px] mt-1 transition-colors duration-200"
              :class="{
                'font-semibold text-habit-orange': isActive(item.path),
                'font-medium': !isActive(item.path),
              }"
            >
              {{ item.name }}
            </span>
            <!-- Active indicator dot -->
            <span
              v-if="isActive(item.path)"
              class="absolute bottom-0 w-1 h-1 rounded-full bg-habit-orange"
            />
          </template>
        </router-link>
      </div>
    </div>
  </nav>
</template>
