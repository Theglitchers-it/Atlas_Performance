<template>
  <div class="min-h-screen bg-habit-bg">
    <!-- Navigation -->
    <nav
      class="fixed top-0 left-0 right-0 z-50 bg-habit-bg/80 backdrop-blur-xl border-b border-habit-border"
    >
      <div class="container mx-auto px-4">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <div class="flex items-center gap-3">
            <span class="font-display font-bold text-2xl text-habit-text">
              Atlas
            </span>
          </div>

          <!-- Desktop Menu -->
          <div class="hidden md:flex items-center gap-1">
            <a href="#features" class="nav-item">Funzionalità</a>
            <a href="#how-it-works" class="nav-item">Come funziona</a>
            <a href="#pricing" class="nav-item">Prezzi</a>
            <a href="#testimonials" class="nav-item">Recensioni</a>
          </div>

          <!-- CTA Buttons -->
          <div class="flex items-center gap-3">
            <router-link to="/login" class="nav-item hidden sm:block"
              >Accedi</router-link
            >
            <router-link to="/register" class="btn-primary btn-sm">
              Inizia gratis
            </router-link>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <HeroSection
      badge="La nuova era del fitness coaching"
      title="Trasforma il tuo business da Personal Trainer"
      subtitle="Gestisci clienti, crea schede personalizzate e monitora i progressi con la piattaforma all-in-one pensata per i professionisti del fitness."
      primaryAction="Inizia gratis"
      secondaryAction="Guarda la demo"
      :stats="heroStats"
      @primary-click="$router.push('/register')"
      @secondary-click="openDemo"
    >
      <template #content>
        <!-- Phone Mockups -->
        <div class="relative max-w-4xl mx-auto">
          <div class="flex justify-center items-end gap-4 md:gap-8">
            <!-- Left Phone -->
            <div class="phone-mockup scale-75 md:scale-90 -rotate-6 opacity-80">
              <div class="phone-mockup-frame">
                <div class="phone-mockup-notch"></div>
                <div class="phone-mockup-screen p-4">
                  <DailyPlanner :animate="false" />
                </div>
              </div>
            </div>

            <!-- Center Phone (main) -->
            <div class="phone-mockup scale-90 md:scale-100 z-10">
              <div class="phone-mockup-frame">
                <div class="phone-mockup-notch"></div>
                <div class="phone-mockup-screen p-4">
                  <StreakCard :streakDays="28" :animate="false" />
                </div>
              </div>
            </div>

            <!-- Right Phone -->
            <div
              class="hidden sm:block phone-mockup scale-75 md:scale-90 rotate-6 opacity-80"
            >
              <div class="phone-mockup-frame">
                <div class="phone-mockup-notch"></div>
                <div class="phone-mockup-screen p-4">
                  <WeeklyReflection :animate="false" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </HeroSection>

    <!-- Logos Section -->
    <section class="py-12 border-t border-b border-habit-border">
      <div class="container mx-auto px-4">
        <p class="text-center text-habit-text-subtle text-sm mb-8">
          Usato da professionisti per migliorare le routine
        </p>
        <div class="flex flex-wrap justify-center items-center gap-8 md:gap-16">
          <span class="pill">#Trainers</span>
          <span class="pill">#Coaches</span>
          <span class="pill">#Busy parents</span>
          <span class="pill">#Students</span>
          <span class="pill">#Remote workers</span>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-24">
      <div class="container mx-auto px-4">
        <!-- Section Header -->
        <div class="section-header">
          <div class="section-tag">
            <span>Smarter habits, less thinking</span>
          </div>
          <h2 class="section-title">
            Suggerimenti AI che si adattano<br />alla tua giornata
          </h2>
          <p class="section-description">
            Atlas impara i tuoi pattern e offre suggerimenti intelligenti che ti
            aiutano a rimanere costante senza dover indovinare cosa fare.
          </p>
        </div>

        <!-- Features Grid -->
        <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard
            v-for="(feature, index) in features"
            :key="index"
            :iconEmoji="feature.icon"
            :iconColor="feature.color"
            :title="feature.title"
            :description="feature.description"
            :delay="index * 0.1"
          />
        </div>
      </div>
    </section>

    <!-- How People Use Section -->
    <section id="how-it-works" class="py-24 bg-habit-bg-light">
      <div class="container mx-auto px-4">
        <div class="section-header">
          <p class="text-habit-text-subtle text-sm mb-2">A closer look</p>
          <h2 class="section-title">
            Come i professionisti usano Atlas ogni giorno
          </h2>
          <div class="flex items-center justify-center gap-2 mt-4">
            <div class="flex items-center">
              <span class="text-habit-orange font-bold">4.9/5</span>
              <div class="flex ml-2">
                <span v-for="i in 5" :key="i" class="text-habit-orange">★</span>
              </div>
            </div>
            <span class="text-habit-text-muted text-sm"
              >(Trusted by 1682+ users)</span
            >
          </div>
        </div>

        <!-- Testimonials Grid -->
        <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <TestimonialCard
            v-for="(testimonial, index) in testimonials"
            :key="index"
            :quote="testimonial.quote"
            :name="testimonial.name"
            :role="testimonial.role"
            :avatar="testimonial.avatar"
            :rating="testimonial.rating"
            :videoThumbnail="testimonial.video"
            :videoDuration="testimonial.duration"
            :delay="index * 0.1"
          />
        </div>
      </div>
    </section>

    <!-- Layout Section -->
    <section class="py-24">
      <div class="container mx-auto px-4">
        <div class="section-header">
          <p class="text-habit-text-subtle text-sm mb-2">
            Habit infrastructure
          </p>
          <h2 class="section-title">
            Un layout che mantiene<br />la tua giornata chiara
          </h2>
          <p class="section-description">
            Atlas porta chiarezza alle tue routine con card chiare, tracking
            realistico dei progressi e guida che si adatta alla tua giornata.
          </p>
        </div>

        <!-- Feature Cards -->
        <div class="grid lg:grid-cols-2 gap-8">
          <!-- Flexible streak rules -->
          <div class="card-dark p-8">
            <h3 class="text-xl font-semibold text-habit-text mb-2">
              Regole flessibili per le streak
            </h3>
            <p class="text-habit-text-muted mb-6">
              I tracker tradizionali sono troppo rigidi. Perdi un giorno e la
              tua streak di 50 giorni è persa per sempre.
            </p>
            <StreakCard
              :streakDays="28"
              subtitle="Build honest streaks that reflect real commitment"
              :modes="[
                { label: 'Travel Mode Active', icon: '✈️', active: true },
                { label: 'Sick Day Allowance', icon: '🏥', active: false },
              ]"
              :animate="false"
            />
          </div>

          <!-- Smart daily planner -->
          <div class="card-dark p-8">
            <h3 class="text-xl font-semibold text-habit-text mb-2">
              Planner giornaliero intelligente
            </h3>
            <p class="text-habit-text-muted mb-6">
              Una vista semplice che mostra solo le abitudini che corrispondono
              al tuo momento della giornata.
            </p>
            <DailyPlanner :animate="false" />
          </div>
        </div>

        <!-- Additional Features -->
        <div class="grid md:grid-cols-3 gap-6 mt-8">
          <div class="card-dark p-6">
            <h4 class="text-habit-text font-semibold mb-2">Routine stacks</h4>
            <p class="text-habit-text-muted text-sm mb-4">
              Raggruppa le abitudini in semplici blocchi così la tua giornata
              risulta organizzata invece che dispersa.
            </p>
            <button class="btn-primary btn-sm">Start your routine now</button>
          </div>

          <div class="card-dark p-6">
            <h4 class="text-habit-text font-semibold mb-2">
              Weekly reflection
            </h4>
            <p class="text-habit-text-muted text-sm">
              Un chiaro riassunto della tua settimana che evidenzia cosa è
              migliorato e cosa necessita aggiustamenti.
            </p>
          </div>

          <div class="card-dark p-6">
            <h4 class="text-habit-text font-semibold mb-2">Gentle reminders</h4>
            <p class="text-habit-text-muted text-sm">
              Brevi promemoria gentili che ti aiutano a restare costante senza
              essere troppo insistenti.
            </p>
            <GentleReminder
              class="mt-4"
              emoji="🧘"
              timeLabel="8:00 PM"
              category="Evening Wind Down"
              title="Take a 5-minute break"
              description="Time to stretch and refresh before your next task."
              :animate="false"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Stats Section -->
    <section class="py-24 bg-habit-bg-light">
      <div class="container mx-auto px-4">
        <div class="grid md:grid-cols-4 gap-6">
          <StatsCard
            v-for="(stat, index) in stats"
            :key="index"
            :value="stat.value"
            :label="stat.label"
            :iconEmoji="stat.icon"
            :iconColor="stat.color"
            :trend="stat.trend"
            :delay="index * 0.1"
          />
        </div>
      </div>
    </section>

    <!-- Adapted Section -->
    <section class="py-24">
      <div class="container mx-auto px-4">
        <div class="section-header">
          <p class="text-habit-text-subtle text-sm mb-2">For every lifestyle</p>
          <h2 class="section-title">
            Adattato al modo in cui<br />vivi e lavori
          </h2>
        </div>

        <!-- User Type Pills -->
        <div class="flex flex-wrap justify-center gap-3 mb-12">
          <button
            v-for="(type, index) in userTypes"
            :key="index"
            class="pill"
            :class="{ 'pill-active': selectedUserType === index }"
            @click="selectedUserType = index"
          >
            {{ type.icon }} {{ type.label }}
          </button>
        </div>

        <!-- User Type Content -->
        <div class="max-w-4xl mx-auto">
          <div
            class="card-dark p-8 flex flex-col md:flex-row gap-8 items-center"
          >
            <div class="flex-1">
              <p class="text-habit-text-muted mb-4">
                {{ userTypes[selectedUserType].description }}
              </p>
              <div class="text-4xl font-bold text-habit-orange">
                {{ userTypes[selectedUserType].stat }}
              </div>
              <p class="text-habit-text-subtle text-sm">
                {{ userTypes[selectedUserType].statLabel }}
              </p>
            </div>
            <div
              class="w-64 h-64 rounded-2xl bg-habit-bg-light flex items-center justify-center"
            >
              <span class="text-8xl">{{
                userTypes[selectedUserType].icon
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="py-24 bg-gradient-to-b from-habit-bg-light to-habit-bg">
      <div class="container mx-auto px-4">
        <div class="max-w-3xl mx-auto text-center">
          <div class="section-tag mx-auto mb-6">
            <span
              class="w-2 h-2 rounded-full bg-habit-success animate-pulse"
            ></span>
            <span>A straightforward system</span>
          </div>
          <h2 class="section-title mb-6">
            Rimani costante con un sistema<br />che si adatta alla vita reale
          </h2>
          <p class="text-habit-text-muted text-lg mb-8">
            Card semplici, routine chiare e piccoli nudge ti aiutano a costruire
            progressi che durano.
          </p>
          <div
            class="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <router-link to="/register" class="btn-primary btn-lg">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                />
              </svg>
              Download for iPhone
            </router-link>
            <button class="btn-secondary btn-lg">
              <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"
                />
              </svg>
              Get it on Android
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="py-12 border-t border-habit-border">
      <div class="container mx-auto px-4">
        <div
          class="flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div class="flex items-center gap-3">
            <span class="text-habit-text font-bold text-lg">Atlas</span>
          </div>

          <div
            class="flex flex-wrap justify-center gap-6 text-habit-text-muted text-sm"
          >
            <a href="#" class="hover:text-habit-text transition-colors"
              >Privacy</a
            >
            <a href="#" class="hover:text-habit-text transition-colors"
              >Terms</a
            >
            <a href="#" class="hover:text-habit-text transition-colors"
              >Support</a
            >
            <a href="#" class="hover:text-habit-text transition-colors"
              >Contact</a
            >
          </div>

          <p class="text-habit-text-subtle text-sm">
            © 2024 Atlas. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import HeroSection from "@/components/ui/HeroSection.vue";
import FeatureCard from "@/components/ui/FeatureCard.vue";
import StatsCard from "@/components/ui/StatsCard.vue";
import TestimonialCard from "@/components/ui/TestimonialCard.vue";
import StreakCard from "@/components/ui/StreakCard.vue";
import WeeklyReflection from "@/components/ui/WeeklyReflection.vue";
import DailyPlanner from "@/components/ui/DailyPlanner.vue";
import GentleReminder from "@/components/ui/GentleReminder.vue";

const selectedUserType = ref(0);

const heroStats: any[] = [
  { value: "1,682+", label: "Utenti attivi" },
  { value: "98%", label: "Soddisfazione" },
  { value: "4.9", label: "Rating medio" },
];

const features: any[] = [
  {
    icon: "🚶",
    color: "orange",
    title: "Morning walk",
    description: "Suggerisce il miglior orario per ricordarti.",
  },
  {
    icon: "📋",
    color: "red",
    title: "Habit Priorities",
    description: "Riordina le abitudini nei giorni intensi.",
  },
  {
    icon: "📊",
    color: "green",
    title: "Routine Insights",
    description: "Evidenzia cosa funziona e cosa sta scivolando.",
  },
  {
    icon: "💚",
    color: "blue",
    title: "Recovery Suggestion",
    description: "Ti aiuta a recuperare quando perdi un giorno.",
  },
];

const stats: any[] = [
  {
    value: "10K+",
    label: "Workout completati",
    icon: "💪",
    color: "orange",
    trend: 12,
  },
  {
    value: "98%",
    label: "Tasso di retention",
    icon: "📈",
    color: "green",
    trend: 5,
  },
  {
    value: "4.9",
    label: "Rating medio",
    icon: "⭐",
    color: "purple",
    trend: null,
  },
  {
    value: "24/7",
    label: "Supporto disponibile",
    icon: "🎯",
    color: "blue",
    trend: null,
  },
];

const testimonials: any[] = [
  {
    quote:
      "Atlas ha cambiato completamente il modo in cui gestisco i miei clienti. Non potrei più farne a meno!",
    name: "Marco Rossi",
    role: "Personal Trainer",
    rating: 5,
  },
  {
    quote:
      "Finalmente una piattaforma che capisce le esigenze dei professionisti del fitness. Intuitiva e potente.",
    name: "Laura Bianchi",
    role: "Fitness Coach",
    rating: 5,
  },
  {
    quote:
      "I miei clienti adorano poter vedere i loro progressi in tempo reale. Ha aumentato la retention del 40%!",
    name: "Andrea Verdi",
    role: "Gym Owner",
    rating: 5,
  },
];

const userTypes: any[] = [
  {
    icon: "💼",
    label: "Professionals",
    description:
      "Per chi gestisce lunghe giornate lavorative, priorità variabili e deadline serrate.",
    stat: "87%",
    statLabel: "Weekly consistency",
  },
  {
    icon: "📚",
    label: "Students",
    description:
      "Per studenti che bilanciano studio, attività sociali e crescita personale.",
    stat: "92%",
    statLabel: "Goal completion",
  },
  {
    icon: "🏠",
    label: "Remote workers",
    description:
      "Per chi lavora da casa e ha bisogno di struttura nelle proprie giornate.",
    stat: "85%",
    statLabel: "Daily routine adherence",
  },
  {
    icon: "👨‍👩‍👧",
    label: "Busy parents",
    description:
      "Per genitori che gestiscono famiglia, lavoro e tempo per sé stessi.",
    stat: "78%",
    statLabel: "Work-life balance score",
  },
];

const openDemo = () => {
  window.location.href = "/login";
};
</script>
