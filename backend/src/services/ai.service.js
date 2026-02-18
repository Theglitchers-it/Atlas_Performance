/**
 * AI Service
 * Integrazione OpenAI GPT-4 per assistente PT intelligente
 * - Suggerimenti esercizi alternativi per infortuni
 * - Risposte contestuali per clienti
 * - Generazione bozze piani alimentari
 * - Analisi progressi
 */

const { query } = require('../config/database');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('AI');

class AIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY || null;
        this.model = process.env.OPENAI_MODEL || 'gpt-4';
        this.baseUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Check se API key è configurata
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Chiamata generica a OpenAI
     */
    async chatCompletion(messages, options = {}) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key non configurata. Aggiungi OPENAI_API_KEY nelle variabili d\'ambiente.');
        }

        const { temperature = 0.7, maxTokens = 1000 } = options;

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature,
                    max_tokens: maxTokens
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            return data.choices[0]?.message?.content || '';
        } catch (error) {
            logger.error('Errore chiamata OpenAI', { error: error.message });
            throw error;
        }
    }

    /**
     * Suggerisci esercizi alternativi per infortuni
     */
    async suggestAlternativeExercises(data) {
        const { exerciseName, injuryDescription, muscleGroup, clientLevel } = data;

        const messages = [
            {
                role: 'system',
                content: `Sei un assistente esperto di fitness e personal training. Rispondi sempre in italiano.
                Quando suggerisci esercizi alternativi, fornisci:
                1. Nome dell'esercizio
                2. Perché è adatto come alternativa
                3. Eventuali precauzioni
                Rispondi in formato JSON con un array "exercises" contenente oggetti con campi: name, reason, precautions.`
            },
            {
                role: 'user',
                content: `Il mio cliente (livello: ${clientLevel || 'intermedio'}) ha un infortunio/limitazione: "${injuryDescription}".
                Dovrebbe fare "${exerciseName}" per il gruppo muscolare "${muscleGroup}", ma non può a causa dell'infortunio.
                Suggerisci 3-5 esercizi alternativi sicuri.`
            }
        ];

        const response = await this.chatCompletion(messages, { temperature: 0.5, maxTokens: 800 });

        try {
            // Prova a parsare il JSON dalla risposta
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Se non è JSON, restituisci il testo raw
        }

        return { exercises: [], rawResponse: response };
    }

    /**
     * Rispondi a domanda del cliente
     */
    async answerClientQuestion(data) {
        const { question, clientName, clientGoal, trainerNotes } = data;

        const messages = [
            {
                role: 'system',
                content: `Sei un assistente AI per un personal trainer. Rispondi alle domande dei clienti in modo professionale, motivante e in italiano.
                NON dare consigli medici specifici. Se la domanda è medica, consiglia di consultare un medico.
                Mantieni le risposte concise (max 200 parole).
                ${trainerNotes ? `Note del trainer: ${trainerNotes}` : ''}`
            },
            {
                role: 'user',
                content: `Il cliente ${clientName || ''} (obiettivo: ${clientGoal || 'fitness generale'}) chiede: "${question}"`
            }
        ];

        return await this.chatCompletion(messages, { temperature: 0.7, maxTokens: 500 });
    }

    /**
     * Genera bozza piano alimentare
     */
    async generateMealPlanDraft(data) {
        const {
            clientName, age, weightKg, heightCm, goal,
            calorieTarget, proteinTarget, restrictions,
            mealsPerDay
        } = data;

        const messages = [
            {
                role: 'system',
                content: `Sei un nutrizionista AI esperto. Genera una bozza di piano alimentare giornaliero in italiano.
                Rispondi in formato JSON con la struttura:
                {
                    "totalCalories": number,
                    "totalProtein": number,
                    "totalCarbs": number,
                    "totalFats": number,
                    "meals": [
                        {
                            "name": "Colazione/Spuntino/Pranzo/Cena",
                            "time": "08:00",
                            "foods": [
                                { "name": "Alimento", "quantity": "100g", "calories": 200, "protein": 20, "carbs": 10, "fats": 5 }
                            ]
                        }
                    ]
                }`
            },
            {
                role: 'user',
                content: `Genera un piano alimentare per:
                - Nome: ${clientName || 'Cliente'}
                - Età: ${age || 30} anni
                - Peso: ${weightKg || 70}kg, Altezza: ${heightCm || 170}cm
                - Obiettivo: ${goal || 'mantenimento'}
                - Calorie target: ${calorieTarget || 2000} kcal
                - Proteine target: ${proteinTarget || 120}g
                - Restrizioni: ${restrictions || 'nessuna'}
                - Pasti al giorno: ${mealsPerDay || 5}`
            }
        ];

        const response = await this.chatCompletion(messages, { temperature: 0.6, maxTokens: 1500 });

        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // Fallback
        }

        return { rawResponse: response };
    }

    /**
     * Analisi progressi cliente
     */
    async analyzeProgress(data) {
        const {
            clientName, goal, measurements, sessions,
            readinessAvg, periodWeeks
        } = data;

        const messages = [
            {
                role: 'system',
                content: `Sei un analista sportivo AI. Analizza i progressi di un cliente e fornisci:
                1. Valutazione generale (1-10)
                2. Punti di forza
                3. Aree di miglioramento
                4. Suggerimenti concreti
                Rispondi in italiano, in modo motivante ma realistico.`
            },
            {
                role: 'user',
                content: `Analizza i progressi di ${clientName || 'questo cliente'} nelle ultime ${periodWeeks || 4} settimane:
                - Obiettivo: ${goal || 'fitness generale'}
                - Misurazioni: ${JSON.stringify(measurements || {})}
                - Sessioni completate: ${sessions?.completed || 0} su ${sessions?.total || 0}
                - Readiness media: ${readinessAvg || 'N/D'}/100
                Fornisci un'analisi dettagliata.`
            }
        ];

        return await this.chatCompletion(messages, { temperature: 0.6, maxTokens: 800 });
    }

    /**
     * Suggerisci workout in base a readiness
     */
    async suggestWorkoutByReadiness(data) {
        const { readinessScore, mood, energyLevel, soreness, plannedWorkout } = data;

        const messages = [
            {
                role: 'system',
                content: `Sei un assistente fitness AI. In base ai dati di readiness del giorno, suggerisci modifiche al workout pianificato.
                Rispondi in italiano con suggerimenti pratici e concisi.`
            },
            {
                role: 'user',
                content: `Dati odierni del cliente:
                - Readiness score: ${readinessScore}/100
                - Mood: ${mood}
                - Energia: ${energyLevel}/10
                - Indolenzimento: ${soreness}/10
                - Workout pianificato: ${plannedWorkout || 'allenamento generico'}

                Il workout pianificato va bene così o suggerisci modifiche?`
            }
        ];

        return await this.chatCompletion(messages, { temperature: 0.5, maxTokens: 500 });
    }

    /**
     * Salva log interazione AI
     */
    async logInteraction(tenantId, userId, data) {
        const { type, prompt, response, tokensUsed } = data;

        try {
            await query(`
                INSERT INTO ai_interaction_logs
                (tenant_id, user_id, interaction_type, prompt_summary, response_summary, tokens_used)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                tenantId, userId, type,
                prompt?.substring(0, 500) || null,
                response?.substring(0, 500) || null,
                tokensUsed || null
            ]);
        } catch (err) {
            // Log silenzioso - la tabella potrebbe non esistere ancora
            logger.warn('Impossibile salvare log AI', { error: err.message });
        }
    }

    /**
     * Verifica limiti utilizzo AI per tenant
     */
    async checkUsageLimit(tenantId) {
        try {
            const [result] = await query(`
                SELECT COUNT(*) as count FROM ai_interaction_logs
                WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
            `, [tenantId]);

            // Limiti basati sul piano (configurabili)
            const monthlyLimit = 500; // Default
            return {
                used: result.count,
                limit: monthlyLimit,
                remaining: Math.max(0, monthlyLimit - result.count),
                withinLimit: result.count < monthlyLimit
            };
        } catch (err) {
            // Tabella potrebbe non esistere
            return { used: 0, limit: 500, remaining: 500, withinLimit: true };
        }
    }
}

module.exports = new AIService();
