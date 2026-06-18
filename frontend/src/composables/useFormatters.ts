/**
 * Formatter utilities condivise per UI clienti/scadenze.
 */

export const getInitials = (
  firstName?: string | null,
  lastName?: string | null,
): string =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

export const formatDate = (d: string | null | undefined): string => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("it-IT");
};

export const formatDateISO = (d: Date | string): string => {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
};

/**
 * Giorni intercorrenti tra oggi e la data passata.
 * Positivo = futuro, negativo = passato.
 */
export const daysFromNow = (d: string | null | undefined): number | null => {
  if (!d) return null;
  const target = new Date(d);
  const now = new Date();
  return Math.ceil(
    (target.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );
};

/** Classi Tailwind per il badge NUOVO / RINNOVO. */
export const getActionBadgeClass = (badge: "NUOVO" | "RINNOVO" | string): string =>
  badge === "NUOVO"
    ? "bg-habit-orange/15 text-habit-orange border-habit-orange/30"
    : "bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30";

/** URL assoluto per una risorsa servita dal backend (fallback a path relativo se gia assoluto). */
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";
export const fileUrl = (path: string | null | undefined): string => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE_URL}${path}`;
};

import type { PhotoType } from "@/types";

/** Label italiane per le categorie foto progresso. */
export const PHOTO_TYPE_LABELS: Record<PhotoType, string> = {
  front: "Frontale",
  side: "Laterale",
  back: "Schiena",
  full_body: "Figura intera",
};

/** Array ordinato delle categorie foto — riusabile in select/chip. */
export const PHOTO_TYPE_OPTIONS: { value: PhotoType; label: string }[] = [
  { value: "front", label: PHOTO_TYPE_LABELS.front },
  { value: "side", label: PHOTO_TYPE_LABELS.side },
  { value: "back", label: PHOTO_TYPE_LABELS.back },
  { value: "full_body", label: PHOTO_TYPE_LABELS.full_body },
];

/** Estrae la parte YYYY-MM-DD da una stringa ISO datetime. */
export const dateOnly = (iso: string | null | undefined): string =>
  iso ? iso.slice(0, 10) : "";

/** Colori/classi per i tag clienti (fidelizzazione) */
export const TAG_COLORS: Record<string, string> = {
  nuovo: "bg-habit-orange/15 text-habit-orange border-habit-orange/30",
  medio: "bg-habit-cyan/10 text-habit-text border-habit-border",
  top: "bg-habit-cyan/15 text-habit-cyan border-habit-cyan/30",
  vecchio: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  dormiente: "bg-red-500/15 text-red-400 border-red-500/30",
};

export const TAG_LABELS: Record<string, string> = {
  nuovo: "Entry",
  medio: "Medio",
  top: "Top",
  vecchio: "Vecchio",
  dormiente: "Dormiente",
};

/** Priorità visualizzazione tag (più alto = più importante/attirare occhio). */
const TAG_PRIORITY: Record<string, number> = {
  dormiente: 100,
  top: 90,
  vecchio: 70,
  medio: 50,
  nuovo: 30,
};

/** Ordina tag per importanza e limita a maxCount. Tag custom (non auto) prendono priorità media. */
export const sortTagsByPriority = (tags: string[], maxCount = 2): string[] => {
  return [...tags]
    .sort(
      (a, b) =>
        (TAG_PRIORITY[b] ?? 80) - (TAG_PRIORITY[a] ?? 80),
    )
    .slice(0, maxCount);
};

export const getTagClass = (tag: string): string =>
  TAG_COLORS[tag] ||
  "bg-habit-bg border-habit-border text-habit-text-subtle";

export const getTagLabel = (tag: string): string =>
  TAG_LABELS[tag] || tag;

export const formatBytes = (bytes: number | null | undefined): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export type ClientFileCategory =
  | "document"
  | "medical"
  | "contract"
  | "nutrition"
  | "certificate"
  | "other";

export const FILE_CATEGORY_LABELS: Record<ClientFileCategory, string> = {
  document: "Documenti",
  medical: "Medici",
  contract: "Contratti",
  nutrition: "Nutrizione",
  certificate: "Certificati",
  other: "Altro",
};

export const FILE_CATEGORY_ICONS: Record<ClientFileCategory, string> = {
  document: "📄",
  medical: "⚕️",
  contract: "📝",
  nutrition: "🥗",
  certificate: "🎓",
  other: "📎",
};

export const FILE_CATEGORY_OPTIONS: {
  value: ClientFileCategory;
  label: string;
}[] = [
  { value: "document", label: "Documento" },
  { value: "medical", label: "Medico" },
  { value: "contract", label: "Contratto" },
  { value: "nutrition", label: "Nutrizione" },
  { value: "certificate", label: "Certificato" },
  { value: "other", label: "Altro" },
];

import type { DietPhase } from "@/types";

export const DIET_PHASE_LABELS: Record<DietPhase, string> = {
  cut: "Cut",
  normocaloric: "Normo",
  bulk: "Bulk",
  free: "Libero",
};

export const DIET_PHASE_BADGE_CLASSES: Record<DietPhase, string> = {
  cut: "bg-red-500/15 text-red-400 border border-red-500/30",
  normocaloric: "bg-habit-cyan/15 text-habit-cyan border border-habit-cyan/30",
  bulk: "bg-habit-orange/15 text-habit-orange border border-habit-orange/30",
  free: "bg-habit-bg text-habit-text-subtle border border-habit-border",
};

export const getDietPhaseLabel = (phase: DietPhase | null | undefined): string =>
  phase ? DIET_PHASE_LABELS[phase] : "-";

export const getDietPhaseBadgeClass = (phase: DietPhase | null | undefined): string =>
  phase ? DIET_PHASE_BADGE_CLASSES[phase] : DIET_PHASE_BADGE_CLASSES.free;
