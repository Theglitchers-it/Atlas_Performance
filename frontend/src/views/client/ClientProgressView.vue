<script setup>
import { ref } from 'vue'
import HabitCard from '@/components/ui/HabitCard.vue'
import PrimaryButton from '@/components/ui/PrimaryButton.vue'
import SecondaryButton from '@/components/ui/SecondaryButton.vue'

// Dati di esempio per i progressi
const progressData = ref({
  peso: {
    attuale: 78.5,
    precedente: 80.2,
    unita: 'kg',
    trend: 'down',
    percentuale: -2.1
  },
  massaGrassa: {
    attuale: 18.3,
    precedente: 20.1,
    unita: '%',
    trend: 'down',
    percentuale: -8.9
  },
  circonferenze: {
    vita: { attuale: 84, precedente: 87, unita: 'cm' },
    petto: { attuale: 102, precedente: 100, unita: 'cm' },
    braccia: { attuale: 36, precedente: 35, unita: 'cm' },
    cosce: { attuale: 58, precedente: 59, unita: 'cm' }
  }
})

// Dati per il mini grafico (ultimi 6 punti)
const pesoHistory = ref([82, 81.2, 80.5, 79.8, 79.2, 78.5])
const massaGrassaHistory = ref([22, 21.2, 20.5, 19.8, 19.0, 18.3])
</script>

<template>
  <div class="min-h-screen bg-habit-bg p-6 md:p-8">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-4xl md:text-5xl font-bold text-white leading-[0.9] tracking-tight mb-2">
        I tuoi <span class="text-habit-orange">Progressi</span>
      </h1>
      <p class="text-white/60 text-lg">Monitora il tuo percorso di trasformazione</p>
    </div>

    <!-- Griglia Card Principali -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

      <!-- Card Peso -->
      <HabitCard class="p-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-white/60 text-sm uppercase tracking-wider mb-1">Peso Corporeo</p>
            <div class="flex items-baseline gap-2">
              <span class="text-4xl font-bold text-white">{{ progressData.peso.attuale }}</span>
              <span class="text-white/60">{{ progressData.peso.unita }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 px-3 py-1 rounded-full"
               :class="progressData.peso.trend === 'down' ? 'bg-habit-cyan/20 text-habit-cyan' : 'bg-habit-orange/20 text-habit-orange'">
            <svg v-if="progressData.peso.trend === 'down'" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
            <span class="text-sm font-medium">{{ progressData.peso.percentuale }}%</span>
          </div>
        </div>

        <!-- Mini Grafico SVG -->
        <div class="h-20 mt-4">
          <svg class="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
            <!-- Area sotto la linea -->
            <defs>
              <linearGradient id="pesoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color: rgb(0, 212, 212); stop-opacity: 0.3"/>
                <stop offset="100%" style="stop-color: rgb(0, 212, 212); stop-opacity: 0"/>
              </linearGradient>
            </defs>
            <path d="M 0,45 L 40,38 L 80,30 L 120,22 L 160,15 L 200,5 L 200,60 L 0,60 Z"
                  fill="url(#pesoGradient)"/>
            <!-- Linea del grafico -->
            <polyline
              points="0,45 40,38 80,30 120,22 160,15 200,5"
              fill="none"
              stroke="#00D4D4"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"/>
            <!-- Punti -->
            <circle cx="0" cy="45" r="3" fill="#00D4D4"/>
            <circle cx="40" cy="38" r="3" fill="#00D4D4"/>
            <circle cx="80" cy="30" r="3" fill="#00D4D4"/>
            <circle cx="120" cy="22" r="3" fill="#00D4D4"/>
            <circle cx="160" cy="15" r="3" fill="#00D4D4"/>
            <circle cx="200" cy="5" r="4" fill="#00D4D4" stroke="#131515" stroke-width="2"/>
          </svg>
        </div>
        <p class="text-white/40 text-xs mt-2">Ultimi 6 check-in</p>
      </HabitCard>

      <!-- Card Massa Grassa -->
      <HabitCard class="p-6">
        <div class="flex justify-between items-start mb-4">
          <div>
            <p class="text-white/60 text-sm uppercase tracking-wider mb-1">Massa Grassa</p>
            <div class="flex items-baseline gap-2">
              <span class="text-4xl font-bold text-white">{{ progressData.massaGrassa.attuale }}</span>
              <span class="text-white/60">{{ progressData.massaGrassa.unita }}</span>
            </div>
          </div>
          <div class="flex items-center gap-1 px-3 py-1 rounded-full bg-habit-cyan/20 text-habit-cyan">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
            </svg>
            <span class="text-sm font-medium">{{ progressData.massaGrassa.percentuale }}%</span>
          </div>
        </div>

        <!-- Mini Grafico SVG -->
        <div class="h-20 mt-4">
          <svg class="w-full h-full" viewBox="0 0 200 60" preserveAspectRatio="none">
            <defs>
              <linearGradient id="massaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color: rgb(0, 212, 212); stop-opacity: 0.3"/>
                <stop offset="100%" style="stop-color: rgb(0, 212, 212); stop-opacity: 0"/>
              </linearGradient>
            </defs>
            <path d="M 0,50 L 40,42 L 80,33 L 120,25 L 160,17 L 200,8 L 200,60 L 0,60 Z"
                  fill="url(#massaGradient)"/>
            <polyline
              points="0,50 40,42 80,33 120,25 160,17 200,8"
              fill="none"
              stroke="#00D4D4"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"/>
            <circle cx="0" cy="50" r="3" fill="#00D4D4"/>
            <circle cx="40" cy="42" r="3" fill="#00D4D4"/>
            <circle cx="80" cy="33" r="3" fill="#00D4D4"/>
            <circle cx="120" cy="25" r="3" fill="#00D4D4"/>
            <circle cx="160" cy="17" r="3" fill="#00D4D4"/>
            <circle cx="200" cy="8" r="4" fill="#00D4D4" stroke="#131515" stroke-width="2"/>
          </svg>
        </div>
        <p class="text-white/40 text-xs mt-2">Ultimi 6 check-in</p>
      </HabitCard>

      <!-- Card Circonferenze -->
      <HabitCard class="p-6 md:col-span-2 lg:col-span-1">
        <div class="mb-4">
          <p class="text-white/60 text-sm uppercase tracking-wider mb-1">Circonferenze</p>
          <p class="text-2xl font-bold text-white">Dettaglio misure</p>
        </div>

        <div class="space-y-4">
          <!-- Vita -->
          <div class="flex items-center justify-between">
            <span class="text-white/80">Vita</span>
            <div class="flex items-center gap-3">
              <span class="text-white font-semibold">{{ progressData.circonferenze.vita.attuale }} cm</span>
              <span class="text-habit-cyan text-sm">-3 cm</span>
            </div>
          </div>
          <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-habit-cyan rounded-full" style="width: 70%"></div>
          </div>

          <!-- Petto -->
          <div class="flex items-center justify-between">
            <span class="text-white/80">Petto</span>
            <div class="flex items-center gap-3">
              <span class="text-white font-semibold">{{ progressData.circonferenze.petto.attuale }} cm</span>
              <span class="text-habit-orange text-sm">+2 cm</span>
            </div>
          </div>
          <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-habit-orange rounded-full" style="width: 85%"></div>
          </div>

          <!-- Braccia -->
          <div class="flex items-center justify-between">
            <span class="text-white/80">Braccia</span>
            <div class="flex items-center gap-3">
              <span class="text-white font-semibold">{{ progressData.circonferenze.braccia.attuale }} cm</span>
              <span class="text-habit-orange text-sm">+1 cm</span>
            </div>
          </div>
          <div class="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-habit-orange rounded-full" style="width: 60%"></div>
          </div>
        </div>
      </HabitCard>
    </div>

    <!-- Sezione Azioni -->
    <HabitCard :hoverable="false" class="p-6">
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 class="text-xl font-bold text-white mb-1">Aggiorna le tue misure</h3>
          <p class="text-white/60">L'ultimo check-in risale a 5 giorni fa</p>
        </div>
        <div class="flex gap-3">
          <SecondaryButton>Storico completo</SecondaryButton>
          <PrimaryButton>Nuovo check-in</PrimaryButton>
        </div>
      </div>
    </HabitCard>

    <!-- Griglia Statistiche Rapide -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
      <HabitCard class="p-4 text-center">
        <p class="text-white/60 text-sm mb-1">Check-in totali</p>
        <p class="text-2xl font-bold text-white">24</p>
      </HabitCard>
      <HabitCard class="p-4 text-center">
        <p class="text-white/60 text-sm mb-1">Settimane attive</p>
        <p class="text-2xl font-bold text-white">12</p>
      </HabitCard>
      <HabitCard class="p-4 text-center">
        <p class="text-white/60 text-sm mb-1">Peso perso</p>
        <p class="text-2xl font-bold text-habit-cyan">-4.2 kg</p>
      </HabitCard>
      <HabitCard class="p-4 text-center">
        <p class="text-white/60 text-sm mb-1">Obiettivo</p>
        <p class="text-2xl font-bold text-habit-orange">75 kg</p>
      </HabitCard>
    </div>
  </div>
</template>
