/**
 * Configurazione OpenAI API
 * Per AI Assistant, Workout Suggestions, Meal Planning, Photo Analysis
 */

const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Configurazioni per diversi casi d'uso
const AI_CONFIGS = {
    // AI Assistant per chat con clienti/PT
    assistant: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        systemPrompt: `Sei un assistente fitness esperto che aiuta Personal Trainer e i loro clienti.
Rispondi in italiano in modo professionale ma amichevole.
Non fornire mai consigli medici specifici - suggerisci sempre di consultare un medico per problemi di salute.
Basa le tue risposte sulle migliori pratiche del fitness e della nutrizione sportiva.`
    },

    // Suggerimenti workout
    workout: {
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 1500,
        systemPrompt: `Sei un esperto di programmazione dell'allenamento.
Fornisci suggerimenti basati su evidenze scientifiche.
Considera sempre: obiettivi del cliente, livello di esperienza, eventuali infortuni, attrezzature disponibili.
Rispondi in italiano con formato strutturato.`
    },

    // Pianificazione pasti
    nutrition: {
        model: 'gpt-4',
        temperature: 0.6,
        max_tokens: 2000,
        systemPrompt: `Sei un nutrizionista sportivo esperto.
Crea piani alimentari bilanciati considerando: fabbisogno calorico, macro, restrizioni alimentari, preferenze.
Usa alimenti comuni e facilmente reperibili in Italia.
Rispondi in italiano con pasti strutturati per giorno.`
    },

    // Analisi foto progressi
    photoAnalysis: {
        model: 'gpt-4-vision-preview',
        temperature: 0.3,
        max_tokens: 1000,
        systemPrompt: `Analizza le foto di progressi fisici in modo oggettivo e professionale.
Identifica cambiamenti visibili nella composizione corporea.
Non fare commenti sul peso o diagnosi mediche.
Rispondi in italiano con osservazioni costruttive.`
    }
};

/**
 * Genera una risposta AI
 * @param {string} type - Tipo di AI (assistant, workout, nutrition, photoAnalysis)
 * @param {string} userMessage - Messaggio/prompt dell'utente
 * @param {Object} context - Contesto aggiuntivo (dati cliente, storico, ecc.)
 * @returns {Promise<string>} Risposta AI
 */
const generateResponse = async (type, userMessage, context = {}) => {
    const config = AI_CONFIGS[type] || AI_CONFIGS.assistant;

    let systemPrompt = config.systemPrompt;

    // Aggiungi contesto se disponibile
    if (context.clientData) {
        systemPrompt += `\n\nDati cliente:\n${JSON.stringify(context.clientData, null, 2)}`;
    }
    if (context.restrictions) {
        systemPrompt += `\n\nRestrizioni/Note: ${context.restrictions}`;
    }

    try {
        const response = await openai.chat.completions.create({
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            messages: [
                { role: 'system', content: systemPrompt },
                ...(context.history || []),
                { role: 'user', content: userMessage }
            ]
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Errore OpenAI:', error.message);
        throw new Error('Errore nella generazione della risposta AI');
    }
};

/**
 * Analizza un'immagine con GPT-4 Vision
 * @param {string} imageUrl - URL dell'immagine o base64
 * @param {string} prompt - Prompt per l'analisi
 * @returns {Promise<string>} Analisi dell'immagine
 */
const analyzeImage = async (imageUrl, prompt) => {
    const config = AI_CONFIGS.photoAnalysis;

    try {
        const response = await openai.chat.completions.create({
            model: config.model,
            temperature: config.temperature,
            max_tokens: config.max_tokens,
            messages: [
                { role: 'system', content: config.systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: imageUrl } }
                    ]
                }
            ]
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Errore analisi immagine:', error.message);
        throw new Error('Errore nell\'analisi dell\'immagine');
    }
};

module.exports = {
    openai,
    AI_CONFIGS,
    generateResponse,
    analyzeImage
};
