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
    async _rawOpenAICall(body) {
        if (!this.isConfigured()) {
            throw new Error('OpenAI API key non configurata. Aggiungi OPENAI_API_KEY nelle variabili d\'ambiente.');
        }
        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body)
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

    async chatCompletion(messages, options = {}) {
        const { temperature = 0.7, maxTokens = 1000 } = options;
        return this._rawOpenAICall({
            model: this.model,
            messages,
            temperature,
            max_tokens: maxTokens
        });
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

    /**
     * Suggerisci una lista di esercizi per un cliente in base a livello, goal, focus.
     * Ritorna JSON con array exercises.
     */
    async suggestExercisesForClient(clientData, options) {
        const {
            firstName, fitnessLevel, primaryGoal, injuries = [], jointPainAreas = []
        } = clientData;
        const { focus = 'strength', equipmentAvailable = [], sessionDurationMin = 60, count = 6 } = options;

        const systemPrompt = `Sei un personal trainer esperto. Rispondi SOLO con un oggetto JSON in questo formato:
{"exercises":[{"name":"...","sets":4,"reps":"8-10","rest_seconds":90,"reasoning":"..."}]}
Gli esercizi devono essere adatti al livello del cliente e sicuri considerando gli infortuni. Italiano, breve, concreto.`;

        const injuryList = injuries.length ? injuries.map(i => `${i.body_part} (${i.severity})`).join(', ') : 'nessuno';
        const painList = jointPainAreas.length ? jointPainAreas.join(', ') : 'nessuno';
        const equipmentList = equipmentAvailable.length ? equipmentAvailable.join(', ') : 'palestra attrezzata';

        const userPrompt = `Genera ${count} esercizi per:
- Cliente: ${firstName}
- Livello: ${fitnessLevel || 'intermediate'}
- Obiettivo: ${primaryGoal || 'general_fitness'}
- Focus sessione: ${focus}
- Durata sessione: ${sessionDurationMin} minuti
- Attrezzatura: ${equipmentList}
- Infortuni attivi: ${injuryList}
- Dolori articolari ricorrenti: ${painList}`;

        const raw = await this.chatCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { temperature: 0.7, maxTokens: 1000 }
        );

        try {
            const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            logger.error('Parsing JSON suggest-exercises fallito', { raw });
            throw new Error('Risposta AI non valida');
        }
    }

    /**
     * Genera 3 varianti di messaggio follow-up per cliente.
     * Tone: caloroso / professionale / motivazionale.
     */
    async generateFollowUpMessage(clientData, context = 'dormant') {
        const {
            firstName,
            primaryGoal,
            lifetimeMonths,
            daysSinceLastSubEnd,
            lastWorkoutAt
        } = clientData;

        const contextDescriptions = {
            dormant: 'cliente dormiente che non rinnova abbonamento',
            expiring: 'cliente con abbonamento in scadenza entro 14 giorni',
            milestone: 'cliente che ha raggiunto un traguardo significativo'
        };

        const systemPrompt = `Sei un copywriter italiano esperto in marketing per personal trainer.
Devi generare ESATTAMENTE 3 varianti di messaggio WhatsApp breve (max 280 caratteri ciascuno) da inviare a un cliente.
Rispondi SOLO con un oggetto JSON in questo formato esatto:
{"variants":[{"tone":"caloroso","message":"..."},{"tone":"professionale","message":"..."},{"tone":"motivazionale","message":"..."}]}
Senza altre spiegazioni. I messaggi devono suonare naturali in italiano, includere il nome del cliente, e chiudere con una call-to-action concreta.`;

        const userPrompt = `Genera 3 varianti per ${contextDescriptions[context] || 'recupero cliente'}.
Dati cliente:
- Nome: ${firstName}
- Obiettivo: ${primaryGoal || 'fitness generale'}
- Mesi totali di abbonamento: ${lifetimeMonths || 0}
- Giorni dall'ultima scadenza: ${daysSinceLastSubEnd || 'N/D'}
- Ultimo allenamento: ${lastWorkoutAt ? new Date(lastWorkoutAt).toLocaleDateString('it-IT') : 'N/D'}`;

        const raw = await this.chatCompletion(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            { temperature: 0.8, maxTokens: 600 }
        );

        try {
            const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            logger.error('Parsing JSON follow-up fallito', { raw });
            throw new Error('Risposta AI non valida');
        }
    }

    /**
     * Analizza foto di un piatto via GPT-4o Vision.
     * Filosofia plan 4: media realistica, non ossessione clinica.
     */
    async analyzeMealPhoto(imageBase64, mimeType = 'image/jpeg', hint = null) {
        const systemPrompt = `Sei un nutrizionista esperto che stima porzioni e macros da foto di piatti.
Filosofia: fornisci MEDIE REALISTICHE, non esatte al grammo. Meglio approssimare che rifiutarsi di stimare.
Rispondi SEMPRE con JSON valido in questo schema esatto:
{
  "items": [
    {"name": "nome alimento in italiano", "estimated_quantity": 150, "unit": "g", "calories": 280, "protein": 25, "carbs": 30, "fat": 8, "confidence": "high|medium|low"}
  ],
  "totals": {"calories": 280, "protein": 25, "carbs": 30, "fat": 8},
  "notes": "breve nota italiana su cosa hai visto e su eventuali incertezze"
}
Non aggiungere testo fuori dal JSON.`;

        const userContent = [
            {
                type: 'text',
                text: hint
                    ? `Analizza questa foto di un pasto. Contesto utente: "${hint}".`
                    : 'Analizza questa foto di un pasto e stima porzioni/macros.'
            },
            {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` }
            }
        ];

        const raw = await this._rawOpenAICall({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            temperature: 0.3,
            max_tokens: 1200
        });

        try {
            const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
            return JSON.parse(cleaned);
        } catch (e) {
            logger.error('Parsing JSON meal photo fallito', { raw });
            throw new Error('Risposta AI non valida');
        }
    }
}

module.exports = new AIService();
