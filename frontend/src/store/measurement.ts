/**
 * Measurement Store - Pinia
 * Gestione unificata misurazioni corporee
 */

import { defineStore } from "pinia";
import { ref } from "vue";
import api from "@/services/api";
import type {
  Client,
  AnthropometricRecord,
  BodyMeasurementRecord,
  CircumferenceRecord,
  SkinfoldRecord,
  BiaRecord,
  MeasurementOverview,
  WeightChange,
  MeasurementComparisonData,
  AvailableDate,
} from "@/types";

interface ActionResult {
  success: boolean;
  message?: string | null;
}

export const useMeasurementStore = defineStore("measurement", () => {
  // === State ===
  const clients = ref<Client[]>([]);
  const selectedClientId = ref<number | null>(null);
  const error = ref<string | null>(null);

  // Per-section loading states
  const overviewLoading = ref(false);
  const anthropometricLoading = ref(false);
  const bodyLoading = ref(false);
  const circumferencesLoading = ref(false);
  const skinfoldsLoading = ref(false);
  const biaLoading = ref(false);
  const comparisonLoading = ref(false);

  // Data
  const overview = ref<MeasurementOverview | null>(null);
  const weightChange = ref<WeightChange | null>(null);
  const anthropometric = ref<AnthropometricRecord[]>([]);
  const bodyMeasurements = ref<BodyMeasurementRecord[]>([]);
  const circumferences = ref<CircumferenceRecord[]>([]);
  const skinfolds = ref<SkinfoldRecord[]>([]);
  const biaMeasurements = ref<BiaRecord[]>([]);

  // Comparison
  const availableDates = ref<AvailableDate[]>([]);
  const comparison = ref<MeasurementComparisonData | null>(null);

  // === Helpers ===
  const cid = () => selectedClientId.value;
  const base = () => `/measurements/${cid()}`;

  // === CLIENT MANAGEMENT ===

  const fetchClients = async (): Promise<ActionResult> => {
    try {
      const response = await api.get("/clients", { params: { limit: 200 } });
      clients.value = response.data.data.clients || [];
      return { success: true };
    } catch (err) {
      console.error("Errore caricamento clienti:", err);
      return { success: false };
    }
  };

  const setClient = async (clientId: number | string | null): Promise<void> => {
    selectedClientId.value = clientId ? parseInt(String(clientId)) : null;
    if (clientId) {
      await fetchAllData();
    } else {
      resetData();
    }
  };

  const resetData = () => {
    overview.value = null;
    weightChange.value = null;
    anthropometric.value = [];
    bodyMeasurements.value = [];
    circumferences.value = [];
    skinfolds.value = [];
    biaMeasurements.value = [];
    availableDates.value = [];
    comparison.value = null;
  };

  const initialize = async (): Promise<void> => {
    await fetchClients();
    if (clients.value.length > 0 && !selectedClientId.value) {
      await setClient(clients.value[0].id);
    }
  };

  // === OVERVIEW & DASHBOARD ===

  const fetchOverview = async (): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    overviewLoading.value = true;
    try {
      const [overviewRes, weightRes] = await Promise.all([
        api.get(`${base()}/overview`),
        api.get(`${base()}/weight-change`),
      ]);
      overview.value = overviewRes.data.data;
      weightChange.value = weightRes.data.data;
      return { success: true };
    } catch (err: any) {
      error.value =
        err.response?.data?.message || "Errore caricamento overview";
      return { success: false };
    } finally {
      overviewLoading.value = false;
    }
  };

  // === ANTHROPOMETRIC ===

  const fetchAnthropometric = async (): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    anthropometricLoading.value = true;
    try {
      const res = await api.get(`${base()}/anthropometric`, {
        params: { limit: 50 },
      });
      anthropometric.value = res.data.data || [];
      return { success: true };
    } catch (err: any) {
      error.value =
        err.response?.data?.message || "Errore caricamento antropometria";
      return { success: false };
    } finally {
      anthropometricLoading.value = false;
    }
  };

  const createAnthropometric = async (
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.post(`${base()}/anthropometric`, data);
      await Promise.all([fetchAnthropometric(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore salvataggio",
      };
    }
  };

  const updateAnthropometric = async (
    id: number,
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.put(`${base()}/anthropometric/${id}`, data);
      await Promise.all([fetchAnthropometric(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore aggiornamento",
      };
    }
  };

  const deleteAnthropometric = async (id: number): Promise<ActionResult> => {
    try {
      await api.delete(`${base()}/anthropometric/${id}`);
      await Promise.all([fetchAnthropometric(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore eliminazione",
      };
    }
  };

  // === BODY MEASUREMENTS ===

  const fetchBodyMeasurements = async (): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    bodyLoading.value = true;
    try {
      const res = await api.get(`${base()}/body`, { params: { limit: 50 } });
      bodyMeasurements.value = res.data.data || [];
      return { success: true };
    } catch (err: any) {
      error.value = err.response?.data?.message || "Errore caricamento peso";
      return { success: false };
    } finally {
      bodyLoading.value = false;
    }
  };

  const createBody = async (
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.post(`${base()}/body`, data);
      await Promise.all([fetchBodyMeasurements(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore salvataggio",
      };
    }
  };

  const updateBody = async (
    id: number,
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.put(`${base()}/body/${id}`, data);
      await Promise.all([fetchBodyMeasurements(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore aggiornamento",
      };
    }
  };

  const deleteBody = async (id: number): Promise<ActionResult> => {
    try {
      await api.delete(`${base()}/body/${id}`);
      await Promise.all([fetchBodyMeasurements(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore eliminazione",
      };
    }
  };

  // === CIRCUMFERENCES ===

  const fetchCircumferences = async (): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    circumferencesLoading.value = true;
    try {
      const res = await api.get(`${base()}/circumferences`, {
        params: { limit: 50 },
      });
      circumferences.value = res.data.data || [];
      return { success: true };
    } catch (err: any) {
      error.value =
        err.response?.data?.message || "Errore caricamento circonferenze";
      return { success: false };
    } finally {
      circumferencesLoading.value = false;
    }
  };

  const createCircumference = async (
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.post(`${base()}/circumferences`, data);
      await Promise.all([fetchCircumferences(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore salvataggio",
      };
    }
  };

  const updateCircumference = async (
    id: number,
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.put(`${base()}/circumferences/${id}`, data);
      await Promise.all([fetchCircumferences(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore aggiornamento",
      };
    }
  };

  const deleteCircumference = async (id: number): Promise<ActionResult> => {
    try {
      await api.delete(`${base()}/circumferences/${id}`);
      await Promise.all([fetchCircumferences(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore eliminazione",
      };
    }
  };

  // === SKINFOLDS ===

  const fetchSkinfolds = async (): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    skinfoldsLoading.value = true;
    try {
      const res = await api.get(`${base()}/skinfolds`, {
        params: { limit: 50 },
      });
      skinfolds.value = res.data.data || [];
      return { success: true };
    } catch (err: any) {
      error.value =
        err.response?.data?.message || "Errore caricamento plicometria";
      return { success: false };
    } finally {
      skinfoldsLoading.value = false;
    }
  };

  const createSkinfold = async (
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.post(`${base()}/skinfolds`, data);
      await Promise.all([fetchSkinfolds(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore salvataggio",
      };
    }
  };

  const updateSkinfold = async (
    id: number,
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.put(`${base()}/skinfolds/${id}`, data);
      await Promise.all([fetchSkinfolds(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore aggiornamento",
      };
    }
  };

  const deleteSkinfold = async (id: number): Promise<ActionResult> => {
    try {
      await api.delete(`${base()}/skinfolds/${id}`);
      await Promise.all([fetchSkinfolds(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore eliminazione",
      };
    }
  };

  // === BIA ===

  const fetchBia = async (): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    biaLoading.value = true;
    try {
      const res = await api.get(`${base()}/bia`, { params: { limit: 50 } });
      biaMeasurements.value = res.data.data || [];
      return { success: true };
    } catch (err: any) {
      error.value = err.response?.data?.message || "Errore caricamento BIA";
      return { success: false };
    } finally {
      biaLoading.value = false;
    }
  };

  const createBia = async (
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.post(`${base()}/bia`, data);
      await Promise.all([fetchBia(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore salvataggio",
      };
    }
  };

  const updateBia = async (
    id: number,
    data: Record<string, any>,
  ): Promise<ActionResult> => {
    try {
      await api.put(`${base()}/bia/${id}`, data);
      await Promise.all([fetchBia(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore aggiornamento",
      };
    }
  };

  const deleteBia = async (id: number): Promise<ActionResult> => {
    try {
      await api.delete(`${base()}/bia/${id}`);
      await Promise.all([fetchBia(), fetchOverview()]);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || "Errore eliminazione",
      };
    }
  };

  // === COMPARISON ===

  const fetchAvailableDates = async (): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    try {
      const res = await api.get(`${base()}/dates`);
      availableDates.value = res.data.data || [];
      return { success: true };
    } catch (err: any) {
      return { success: false };
    }
  };

  const fetchComparison = async (
    date1: string,
    date2: string,
  ): Promise<ActionResult> => {
    if (!cid()) return { success: false };
    comparisonLoading.value = true;
    try {
      const res = await api.get(`${base()}/compare`, {
        params: { date1, date2 },
      });
      comparison.value = res.data.data;
      return { success: true };
    } catch (err: any) {
      error.value = err.response?.data?.message || "Errore confronto";
      return { success: false };
    } finally {
      comparisonLoading.value = false;
    }
  };

  // === FETCH ALL DATA ===

  const fetchAllData = async (): Promise<void> => {
    if (!cid()) return;
    await Promise.all([
      fetchOverview(),
      fetchAnthropometric(),
      fetchBodyMeasurements(),
      fetchCircumferences(),
      fetchSkinfolds(),
      fetchBia(),
      fetchAvailableDates(),
    ]);
  };

  return {
    // State
    clients,
    selectedClientId,
    error,
    overviewLoading,
    anthropometricLoading,
    bodyLoading,
    circumferencesLoading,
    skinfoldsLoading,
    biaLoading,
    comparisonLoading,
    // Data
    overview,
    weightChange,
    anthropometric,
    bodyMeasurements,
    circumferences,
    skinfolds,
    biaMeasurements,
    availableDates,
    comparison,
    // Actions
    fetchClients,
    setClient,
    initialize,
    fetchAllData,
    fetchOverview,
    fetchAnthropometric,
    createAnthropometric,
    updateAnthropometric,
    deleteAnthropometric,
    fetchBodyMeasurements,
    createBody,
    updateBody,
    deleteBody,
    fetchCircumferences,
    createCircumference,
    updateCircumference,
    deleteCircumference,
    fetchSkinfolds,
    createSkinfold,
    updateSkinfold,
    deleteSkinfold,
    fetchBia,
    createBia,
    updateBia,
    deleteBia,
    fetchAvailableDates,
    fetchComparison,
  };
});
