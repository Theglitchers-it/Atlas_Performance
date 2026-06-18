// ===== Core Entity Types =====

export type AppRole = "gym_admin" | "trainer" | "nutritionist" | "client" | "front_desk" | "accountant";
export type LegacyRole = "tenant_owner" | "staff" | "client" | "super_admin";

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: LegacyRole;
  roles?: AppRole[];
  parentUserId?: number | null;
  tenantId: string;
  clientId?: number;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  subscription_plan?: string;
  subscriptionPlan?: string;
}

export interface Client {
  id: number;
  tenant_id: string;
  user_id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  status: "active" | "inactive" | "cancelled";
  fitness_level?: "beginner" | "intermediate" | "advanced";
  goal_weight_kg?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  last_workout_at?: string | null;
  active_subscription_end_date?: string | null;
  last_measurement_date?: string | null;
  lifetime_subscription_months?: number | null;
  first_subscription_date?: string | null;
  days_since_last_sub_end?: number | null;
  tags?: string[];
  sport_history?: string | null;
  occupation_type?: OccupationType | null;
  daily_steps_avg?: number | null;
  joint_pain_areas?: string[] | null;
  primary_goal?: string;
  previous_diets?: string | null;
  dietary_restrictions?: string[] | null;
  food_allergies?: string | null;
  current_diet_phase?: DietPhase | null;
  baseline_stress_level?: number | null;
  meals_per_day_habit?: number | null;
  // Fase 7: foto + activity recap
  photo_url?: string | null;
  recap_last_workout_at?: string | null;
  recap_last_checkin_at?: string | null;
  weight_trend_30d?: Array<{ d: string; w: number }> | null;
  primary_trainer_id?: number | null;
  primary_trainer_first_name?: string | null;
  primary_trainer_last_name?: string | null;
}

export type OccupationType =
  | "sedentary"
  | "moderately_active"
  | "active"
  | "highly_active";

export const OCCUPATION_OPTIONS: { value: OccupationType; label: string }[] = [
  { value: "sedentary", label: "Sedentario" },
  { value: "moderately_active", label: "Moderatamente attivo" },
  { value: "active", label: "Attivo" },
  { value: "highly_active", label: "Molto attivo" },
];

export const JOINT_PAIN_OPTIONS: string[] = [
  "spalla",
  "ginocchio",
  "schiena",
  "anca",
  "caviglia",
  "polso",
  "gomito",
  "collo",
];

export type DietPhase = "cut" | "normocaloric" | "bulk" | "free";

export type MealType =
  | "breakfast"
  | "morning_snack"
  | "lunch"
  | "afternoon_snack"
  | "dinner"
  | "evening_snack"
  | "other";

export const MEAL_TYPE_OPTIONS: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Colazione" },
  { value: "morning_snack", label: "Spuntino mattina" },
  { value: "lunch", label: "Pranzo" },
  { value: "afternoon_snack", label: "Spuntino pomeriggio" },
  { value: "dinner", label: "Cena" },
  { value: "evening_snack", label: "Spuntino sera" },
  { value: "other", label: "Altro" },
];

export interface Food {
  id: number;
  name: string;
  brand: string | null;
  default_unit: string;
  default_quantity: number;
  calories_per_100: number | null;
  protein_per_100: number | null;
  carbs_per_100: number | null;
  fat_per_100: number | null;
  fiber_per_100: number | null;
  is_preset: boolean;
}

export interface FoodLogEntry {
  id: number;
  food_id: number | null;
  food_name: string;
  quantity: number;
  unit: string;
  meal_type: MealType;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  logged_at: string;
  notes: string | null;
  entered_by?: number;
}

export interface FoodLogDayTotals {
  calories: number | string;
  protein: number | string;
  carbs: number | string;
  fat: number | string;
  fiber: number | string;
  entries_count: number;
}

export type HealthStatus = "green" | "yellow" | "red";

export interface KeyExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  exercise_category: string | null;
  note: string | null;
  created_at: string;
}

export interface PerformancePoint {
  date: string;
  estimated_1rm: number;
  top_weight: number;
  top_reps: number;
}

export interface VolumeByMuscleItem {
  muscle_group_id: number;
  muscle_group: string;
  category: string | null;
  weighted_sets: number;
  raw_sets: number;
}

export interface VolumeByMuscleResponse {
  items: VolumeByMuscleItem[];
  totals: {
    muscle_groups: number;
    raw_sets: number;
    weighted_sets: number;
  };
  period: {
    from: string;
    to: string;
    program_name: string | null;
  };
}

export interface ClientHealthSnapshot {
  client: {
    id: number;
    first_name: string;
    last_name: string;
    current_diet_phase: DietPhase | null;
    baseline_stress_level: number | null;
  };
  readiness: {
    avg_7d: number | null;
    entries_7d: number;
  };
  nutrition: {
    avg_calories_7d: number | null;
    target_calories: number | null;
    caloric_gap_pct: number | null;
    logged_days_7d: number;
    has_active_plan: boolean;
  };
  status: HealthStatus;
  warnings: string[];
}

export const DIET_PHASE_OPTIONS: { value: DietPhase; label: string; description: string }[] = [
  { value: "free", label: "Libero", description: "Nessuna dieta attiva" },
  { value: "cut", label: "Taglio calorico", description: "Deficit calorico (dimagrimento)" },
  { value: "normocaloric", label: "Normocalorica", description: "Mantenimento peso" },
  { value: "bulk", label: "Massa", description: "Surplus calorico (crescita muscolare)" },
];

export const DIETARY_RESTRICTION_OPTIONS: string[] = [
  "vegetariano",
  "vegano",
  "senza glutine",
  "senza lattosio",
  "kosher",
  "halal",
  "pescetariano",
  "low-carb",
  "keto",
];

export type ClientAutoTag =
  | "nuovo"
  | "medio"
  | "top"
  | "vecchio"
  | "dormiente";

export const CLIENT_AUTO_TAGS: readonly ClientAutoTag[] = [
  "nuovo",
  "medio",
  "top",
  "vecchio",
  "dormiente",
] as const;

export type InjurySeverity = "mild" | "moderate" | "severe";
export type InjuryStatus = "active" | "recovering" | "recovered";

export const INJURY_SEVERITY_OPTIONS: {
  value: InjurySeverity;
  label: string;
}[] = [
  { value: "mild", label: "Lieve" },
  { value: "moderate", label: "Moderato" },
  { value: "severe", label: "Grave" },
];

export const INJURY_STATUS_OPTIONS: {
  value: InjuryStatus;
  label: string;
}[] = [
  { value: "active", label: "Attivo" },
  { value: "recovering", label: "In recupero" },
  { value: "recovered", label: "Guarito" },
];

export interface Injury {
  id: number;
  body_part: string;
  description: string | null;
  severity: InjurySeverity;
  injury_date: string | null;
  status: InjuryStatus;
  notes: string | null;
}

export interface Appointment {
  id: number;
  tenant_id: string;
  client_id: number;
  trainer_id: number;
  start_datetime: string;
  end_datetime: string;
  appointment_type: "training" | "assessment" | "consultation" | "other";
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
  location?: string;
  notes?: string;
  google_event_id?: string;
  outlook_event_id?: string;
  client_name?: string;
  trainer_name?: string;
  created_at: string;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  description?: string;
  category?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  duration_minutes?: number;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: number;
  exercise_id: number;
  exercise_name: string;
  sets: number;
  reps?: number;
  rest_seconds?: number;
  order_index: number;
}

export interface Session {
  id: number;
  client_id: number;
  workout_template_id: number;
  status: "in_progress" | "completed" | "skipped";
  started_at: string;
  completed_at?: string;
  duration_minutes?: number;
  notes?: string;
  xp_earned?: number;
}

export interface Exercise {
  id: number;
  name: string;
  description?: string;
  category: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  equipment?: string;
  video_url?: string;
  muscle_groups: string[];
}

// ===== Measurement Types =====

export interface AnthropometricRecord {
  id: number;
  tenant_id: string;
  client_id: number;
  measurement_date: string;
  height_cm: number | null;
  weight_kg: number | null;
  age_years: number | null;
  daily_steps_avg: number | null;
  notes: string | null;
  created_at: string;
}

export interface BodyMeasurementRecord {
  id: number;
  tenant_id: string;
  client_id: number;
  measurement_date: string;
  weight_kg: number | null;
  body_fat_percentage: number | null;
  muscle_mass_kg: number | null;
  notes: string | null;
  created_at: string;
}

export interface CircumferenceRecord {
  id: number;
  tenant_id: string;
  client_id: number;
  measurement_date: string;
  waist_cm: number | null;
  hips_cm: number | null;
  biceps_cm: number | null;
  biceps_flexed_cm: number | null;
  shoulders_cm: number | null;
  chest_cm: number | null;
  thigh_upper_cm: number | null;
  thigh_lower_cm: number | null;
  glutes_cm: number | null;
  waist_hip_ratio: number | null;
  notes: string | null;
  created_at: string;
}

export interface SkinfoldRecord {
  id: number;
  tenant_id: string;
  client_id: number;
  measurement_date: string;
  chest_mm: number | null;
  subscapular_mm: number | null;
  suprailiac_mm: number | null;
  abdominal_mm: number | null;
  quadriceps_mm: number | null;
  biceps_mm: number | null;
  triceps_mm: number | null;
  cheek_mm: number | null;
  calf_mm: number | null;
  sum_total_mm: number | null;
  body_fat_percentage: number | null;
  calculation_method:
    | "jackson_pollock_3"
    | "jackson_pollock_7"
    | "durnin_womersley";
  notes: string | null;
  created_at: string;
}

export interface BiaRecord {
  id: number;
  tenant_id: string;
  client_id: number;
  measurement_date: string;
  lean_mass_kg: number | null;
  lean_mass_pct: number | null;
  fat_mass_kg: number | null;
  fat_mass_pct: number | null;
  total_body_water_l: number | null;
  total_body_water_pct: number | null;
  muscle_mass_kg: number | null;
  basal_metabolic_rate: number | null;
  visceral_fat_level: number | null;
  bone_mass_kg: number | null;
  device_model: string | null;
  notes: string | null;
  created_at: string;
}

export interface MeasurementOverview {
  anthropometric: AnthropometricRecord | null;
  body: BodyMeasurementRecord | null;
  circumference: CircumferenceRecord | null;
  skinfold: SkinfoldRecord | null;
  bia: BiaRecord | null;
}

export interface WeightChange {
  current: number | null;
  previous: number | null;
  change: number;
  percentage: number;
}

export interface MeasurementComparisonData {
  date1: string;
  date2: string;
  anthropometric: {
    before: AnthropometricRecord | null;
    after: AnthropometricRecord | null;
  };
  body: {
    before: BodyMeasurementRecord | null;
    after: BodyMeasurementRecord | null;
  };
  circumference: {
    before: CircumferenceRecord | null;
    after: CircumferenceRecord | null;
  };
  skinfold: { before: SkinfoldRecord | null; after: SkinfoldRecord | null };
  bia: { before: BiaRecord | null; after: BiaRecord | null };
}

export interface AvailableDate {
  measurement_date: string;
  type: "anthropometric" | "body" | "circumference" | "skinfold" | "bia";
}

export type MeasurementType =
  | "anthropometric"
  | "body"
  | "circumferences"
  | "skinfolds"
  | "bia";

// Backward-compatible aliases
export type BodyMeasurement = BodyMeasurementRecord;
export type Circumference = CircumferenceRecord;

export interface ReadinessCheckin {
  id: number;
  client_id: number;
  checkin_date: string;
  sleep_quality: number;
  energy_level: number;
  muscle_soreness: number;
  stress_level: number;
  readiness_score: number;
  notes?: string;
}

export interface Notification {
  id: number;
  user_id: number;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
  priority?: string;
  category?: string;
}

// ===== Gamification Types =====

export interface GamificationDashboard {
  xp_points: number;
  level: number;
  xpToNextLevel: number;
  xpProgress: number;
  streak_days: number;
  titles: Title[];
  recentXP: XPTransaction[];
  badges?: Title[];
  challenges?: Challenge[];
  xp?: number;
  streak?: number;
  achievementsUnlocked?: number;
  titlesUnlocked?: number;
  activeChallenges?: number;
  xpInLevel?: number;
  xpNeeded?: number;
}

export interface Title {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
  category?: string;
  rarity?: string;
  title_name?: string;
  title_description?: string;
}

export interface XPTransaction {
  id: number;
  amount?: number;
  reason?: string;
  created_at: string;
  source_type?: string;
  source_id?: number;
  points?: number;
  transaction_type?: string;
  description?: string | null;
  reference_type?: string | null;
  reference_id?: number | null;
}

export interface Challenge {
  id: number;
  name: string;
  description: string;
  type: string;
  target_value: number;
  start_date: string;
  end_date: string;
  participants_count: number;
  status?: "active" | "completed" | "upcoming";
  reward_xp?: number;
  progress?: number;
  challenge_type?: string;
  participant_status?: string;
  current_value?: number;
  xp_reward?: number;
  // userParticipation: shape ritornato da backend gamification.service.js per il challenge corrente
  // (row da challenge_participants JOIN clients). I campi riflettono lo schema reale del DB.
  userParticipation?: {
    id?: number;
    client_id?: number;
    challenge_id?: number;
    status?: string;
    current_value?: number;
    started_at?: string | null;
    completed_at?: string | null;
    first_name?: string;
    last_name?: string;
  } | null;
  participants?: Array<{
    id?: number;
    user_id: number;
    user_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string | null;
    progress?: number;
    level?: number;
    current_value?: number;
    status?: string;
  }>;
}

// ===== Gamification: nuove feature =====

export interface XPSparkPoint {
  date: string;
  xp: number;
}

export interface StreakHeatmapDay {
  date: string;
  activities: number;
  intensity: number;
}

export interface NextAchievement {
  id: number;
  name: string;
  description: string;
  icon_url: string | null;
  category: string;
  rarity: string;
  xp_reward: number;
  requirement_type: string | null;
  requirement_value: number;
  progress_value: number;
  progress_pct: number;
  xp_remaining: number;
}

export interface RankingInfo {
  position: number;
  total: number;
  percentile: number;
  xp: number;
  xp_to_next: number;
  next_user_name: string | null;
}

export interface WeeklyRecapDelta {
  xp: number;
  workouts: number;
  achievements: number;
}

export interface WeeklyRecap {
  week_start: string;
  this_week: WeeklyRecapDelta;
  last_week: WeeklyRecapDelta;
  xp_delta_pct: number;
  streak_current: number;
}

export type WeeklyGoalType = "xp" | "workouts" | "challenges" | "streak";

export interface WeeklyGoal {
  id: number;
  goal_type: WeeklyGoalType;
  target_value: number;
  current_value: number;
  progress_pct: number;
  achieved: boolean;
  status: "active" | "completed" | "expired";
  week_start: string;
}

// ===== API Response Types =====

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== Analytics Types =====

export interface AnalyticsOverview {
  clients: {
    total: number;
    active: number;
    paused: number;
    inactive: number;
    new_clients_30d?: number;
    total_clients?: number;
    active_clients?: number;
  };
  sessions: {
    total: number;
    completed: number;
    completionRate: number;
  };
  revenue?: {
    total: number;
    monthly: number;
  };
}

// ===== Action Items (Dashboard Trainer) =====

export type ActionBadge = "NUOVO" | "RINNOVO";
export type ActionType =
  | "new_no_check"
  | "subscription_expiring"
  | "checkin_overdue";

export type ActionTypeFilter = "all" | "renewal" | "checkin";

export interface ActionItem {
  client_id: number;
  first_name: string;
  last_name: string;
  badge: ActionBadge;
  action_type: ActionType;
  message: string;
  urgency: number;
  meta: {
    days_since_signup?: number;
    subscription_id?: number;
    plan_type?: string;
    end_date?: string;
    days_left?: number;
    last_checkin_date?: string;
    days_since_checkin?: number;
  };
}

export interface ActionItemsCounts {
  total: number;
  new: number;
  renewal: number;
  expiring_subscriptions: number;
  checkin_overdue: number;
  new_no_check: number;
}

export interface ActionItemsResponse {
  items: ActionItem[];
  counts: ActionItemsCounts;
}

export interface SessionTrendPoint {
  date: string;
  total: number;
  completed: number;
}

export interface TopClient {
  id: number;
  first_name: string;
  last_name: string;
  level: number;
  xp_points: number;
  completed_sessions: number;
  total_minutes: number;
}

// ===== Nutrition Types =====

export interface MealPlan {
  id: number;
  client_id: number;
  name: string;
  description?: string;
  calories_target?: number;
  protein_target?: number;
  carbs_target?: number;
  fat_target?: number;
  start_date?: string;
  end_date?: string;
  status: "active" | "draft" | "archived";
  meals: Meal[];
}

export interface Meal {
  id: number;
  meal_plan_id: number;
  name: string;
  time_of_day: "breakfast" | "snack_am" | "lunch" | "snack_pm" | "dinner";
  foods: FoodItem[];
}

export interface FoodItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ===== Location & Class Types =====

export interface Location {
  id: number;
  tenant_id: string;
  name: string;
  address?: string;
  capacity?: number;
  is_active: boolean;
}

export interface GroupClass {
  id: number;
  tenant_id: string;
  name: string;
  description?: string;
  trainer_id: number;
  location_id?: number;
  max_participants: number;
  current_participants: number;
  schedule_day: string;
  start_time: string;
  end_time: string;
  status: "active" | "cancelled" | "completed";
}

// ===== Video & Program Types =====

export interface Video {
  id: number;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  category: string;
  duration_seconds?: number;
  exercise_id?: number;
}

export interface Program {
  id: number;
  name: string;
  description?: string;
  duration_weeks: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  workouts: WorkoutTemplate[];
  created_at: string;
}

// ===== Community & Chat Types =====

export interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id?: number;
  channel_id?: number;
  content: string;
  type: "text" | "image" | "file";
  is_read: boolean;
  created_at: string;
}

export interface CommunityPost {
  id: number;
  user_id: number;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  author_name: string;
  created_at: string;
  user_saved?: number;
  is_pinned?: boolean;
  user_liked?: number;
  postType?: string;
}

// ===== Alert & Referral Types =====

export interface Alert {
  id: number;
  tenant_id: string;
  type:
    | "payment_due"
    | "session_missed"
    | "goal_reached"
    | "subscription_expiring"
    | "custom";
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

export interface Referral {
  id: number;
  referrer_id: number;
  referee_email: string;
  status: "pending" | "accepted" | "expired";
  reward_type?: string;
  reward_amount?: number;
  created_at: string;
}

// ===== Volume & Progress Types =====

export interface VolumeData {
  muscle_group: string;
  total_sets: number;
  total_reps: number;
  total_weight: number;
  date: string;
}

export type PhotoType = "front" | "side" | "back" | "full_body";

export interface ProgressPhoto {
  id: number;
  client_id: number;
  photo_url: string;
  thumbnail_url: string | null;
  photo_type: PhotoType;
  taken_at: string;
  notes: string | null;
  body_weight: number | null;
  body_fat_pct: number | null;
}

// ===== Calendar Event Type (FullCalendar) =====

export interface CalendarEvent {
  id: string | number;
  title: string;
  start: string;
  end: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: Record<string, any>;
}

// ===== Store Types =====

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface BookingFilters {
  clientId: number | null;
  trainerId: number | null;
  status: string | null;
  locationId?: number | null;
}

export interface BookingState {
  appointments: Appointment[];
  clients: Client[];
  trainers: User[];
  loading: boolean;
  error: string | null;
  currentView: "day" | "week" | "month";
  currentDate: string;
  filters: BookingFilters;
}

// ===== Router Meta Types =====

export interface RouteMeta {
  requiresAuth?: boolean;
  roles?: Array<User["role"]>;
  title?: string;
  layout?: "default" | "auth" | "client";
}

// ===== Form Types =====

export interface CreateAppointmentForm {
  clientId: string | number;
  trainerId: string | number;
  date: string;
  startTime: string;
  endTime: string;
  appointmentType: Appointment["appointment_type"];
  location: string;
  notes: string;
}

export interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  phone?: string;
}
