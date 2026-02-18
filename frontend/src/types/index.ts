// ===== Core Entity Types =====

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: "tenant_owner" | "staff" | "client" | "super_admin";
  tenantId: string;
  clientId?: number;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  [key: string]: any;
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
  [key: string]: any;
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
  [key: string]: any;
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
  [key: string]: any;
}

export interface Title {
  id: number;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlocked_at?: string;
  [key: string]: any;
}

export interface XPTransaction {
  id: number;
  amount: number;
  reason: string;
  created_at: string;
  [key: string]: any;
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
  [key: string]: any;
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

export interface ProgressPhoto {
  id: number;
  client_id: number;
  image_url: string;
  category: "front" | "side" | "back";
  notes?: string;
  taken_at: string;
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
