/**
 * Photo Analysis Service
 * Analisi AI delle foto di progresso con OpenAI GPT-4 Vision
 */

const { query, transaction } = require('../config/database');
const { analyzeImage } = require('../config/openai');
const { createServiceLogger } = require('../config/logger');
const logger = createServiceLogger('PHOTO_ANALYSIS');

class PhotoAnalysisService {
    /**
     * Analizza una foto di progresso usando OpenAI Vision API
     * @param {string} photoUrl - URL della foto di progresso
     * @param {number} clientId
     * @param {string} tenantId
     * @param {Object} options - Opzioni aggiuntive (angle, notes)
     * @returns {Object} risultati dell'analisi
     */
    async analyzePhoto(photoUrl, clientId, tenantId, options = {}) {
        try {
            const { angle = 'front', notes = '' } = options;

            // 1. Verifica che il cliente esista
            const [client] = await query(
                `SELECT id, first_name, last_name, gender, height_cm, current_weight_kg, primary_goal
                 FROM clients WHERE id = ? AND tenant_id = ?`,
                [clientId, tenantId]
            );

            if (!client) {
                throw { status: 404, message: 'Cliente non trovato' };
            }

            // 2. Ottieni foto precedenti per il confronto (ultime 3)
            const previousPhotos = await query(
                `SELECT photo_url, captured_at, angle, ai_body_fat_estimate, ai_notes
                 FROM progress_photos
                 WHERE client_id = ? AND tenant_id = ? AND angle = ?
                 ORDER BY captured_at DESC LIMIT 3`,
                [clientId, tenantId, angle]
            );

            // 3. Costruisci il prompt per l'analisi
            const analysisPrompt = this._buildAnalysisPrompt(client, previousPhotos, angle, notes);

            // 4. Chiama OpenAI Vision API
            const aiResponse = await analyzeImage(photoUrl, analysisPrompt);

            // 5. Parsa la risposta AI
            const parsedAnalysis = this._parseAIResponse(aiResponse);

            // 6. Salva la foto e l'analisi nel database
            const photoId = await this._savePhotoAnalysis(
                tenantId,
                clientId,
                photoUrl,
                angle,
                parsedAnalysis,
                aiResponse,
                notes
            );

            return {
                photoId,
                analysis: {
                    bodyFatEstimate: parsedAnalysis.bodyFatEstimate,
                    muscleDevelopment: parsedAnalysis.muscleDevelopment,
                    posture: parsedAnalysis.posture,
                    overallAssessment: parsedAnalysis.overallAssessment,
                    recommendations: parsedAnalysis.recommendations,
                    comparisonNotes: parsedAnalysis.comparisonNotes
                },
                rawResponse: aiResponse
            };

        } catch (error) {
            logger.error('Errore analisi foto', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante l\'analisi della foto',
                details: error.message
            };
        }
    }

    /**
     * Costruisce il prompt per l'analisi AI
     * @private
     */
    _buildAnalysisPrompt(client, previousPhotos, angle, userNotes) {
        let prompt = `Analizza questa foto di progresso fisico in modo professionale e obiettivo.

INFORMAZIONI CLIENTE:
- Nome: ${client.first_name} ${client.last_name}
- Sesso: ${client.gender || 'Non specificato'}
- Altezza: ${client.height_cm ? `${client.height_cm} cm` : 'Non specificata'}
- Peso attuale: ${client.current_weight_kg ? `${client.current_weight_kg} kg` : 'Non specificato'}
- Obiettivo: ${client.primary_goal || 'Non specificato'}
- Angolazione foto: ${angle}
${userNotes ? `- Note PT: ${userNotes}` : ''}

`;

        if (previousPhotos.length > 0) {
            prompt += `STORICO PRECEDENTE (per confronto):
`;
            previousPhotos.forEach((photo, index) => {
                const daysAgo = Math.floor((new Date() - new Date(photo.captured_at)) / (1000 * 60 * 60 * 24));
                prompt += `- Foto ${index + 1} (${daysAgo} giorni fa): ${photo.ai_notes || 'Nessuna nota'}\n`;
            });
            prompt += '\n';
        }

        prompt += `ANALISI RICHIESTA:
Fornisci un'analisi strutturata in formato JSON con i seguenti campi:

{
  "bodyFatEstimate": "percentuale stimata o range (es: '15-18%')",
  "muscleDevelopment": "osservazioni sullo sviluppo muscolare visibile (specifiche per gruppo muscolare se possibile)",
  "posture": "note sulla postura e allineamento corporeo",
  "overallAssessment": "valutazione generale dei progressi",
  "recommendations": "suggerimenti costruttivi per migliorare",
  "comparisonNotes": "confronto con foto precedenti se disponibili"
}

LINEE GUIDA:
- Sii obiettivo e professionale
- Concentrati su aspetti visibili e misurabili
- Non fare diagnosi mediche
- Usa un linguaggio motivante ma realistico
- Rispondi in italiano
- Se non ci sono foto precedenti, ometti comparisonNotes
- Per bodyFatEstimate, fornisci un range realistico basato su indicatori visivi

Analizza ora la foto fornita.`;

        return prompt;
    }

    /**
     * Parsa la risposta AI e estrae i dati strutturati
     * @private
     */
    _parseAIResponse(aiResponse) {
        try {
            // Cerca JSON nella risposta
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);

                return {
                    bodyFatEstimate: parsed.bodyFatEstimate || 'Non determinabile',
                    muscleDevelopment: parsed.muscleDevelopment || 'Nessuna osservazione',
                    posture: parsed.posture || 'Nessuna nota',
                    overallAssessment: parsed.overallAssessment || aiResponse,
                    recommendations: parsed.recommendations || 'Nessun suggerimento',
                    comparisonNotes: parsed.comparisonNotes || null
                };
            }

            // Se non c'è JSON valido, usa la risposta completa come assessment
            return {
                bodyFatEstimate: 'Non determinabile',
                muscleDevelopment: 'Vedi valutazione generale',
                posture: 'Vedi valutazione generale',
                overallAssessment: aiResponse,
                recommendations: 'Continua il monitoraggio con foto regolari',
                comparisonNotes: null
            };

        } catch (error) {
            logger.error('Errore parsing risposta AI', { error: error.message });

            // Fallback: usa la risposta raw
            return {
                bodyFatEstimate: 'Non determinabile',
                muscleDevelopment: 'Analisi non disponibile',
                posture: 'Analisi non disponibile',
                overallAssessment: aiResponse,
                recommendations: 'Riprova l\'analisi',
                comparisonNotes: null
            };
        }
    }

    /**
     * Salva la foto e i risultati dell'analisi
     * @private
     */
    async _savePhotoAnalysis(tenantId, clientId, photoUrl, angle, parsedAnalysis, rawResponse, notes) {
        const result = await query(
            `INSERT INTO progress_photos
             (tenant_id, client_id, photo_url, angle, captured_at,
              ai_analyzed, ai_body_fat_estimate, ai_muscle_notes, ai_posture_notes,
              ai_overall_assessment, ai_recommendations, ai_comparison_notes,
              ai_raw_response, notes)
             VALUES (?, ?, ?, ?, NOW(), TRUE, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                clientId,
                photoUrl,
                angle,
                parsedAnalysis.bodyFatEstimate,
                parsedAnalysis.muscleDevelopment,
                parsedAnalysis.posture,
                parsedAnalysis.overallAssessment,
                parsedAnalysis.recommendations,
                parsedAnalysis.comparisonNotes,
                rawResponse,
                notes || null
            ]
        );

        return result.insertId;
    }

    /**
     * Confronta due foto di progresso
     * @param {number} photoId1 - ID prima foto
     * @param {number} photoId2 - ID seconda foto
     * @param {number} clientId
     * @param {string} tenantId
     * @returns {Object} report di confronto
     */
    async comparePhotos(photoId1, photoId2, clientId, tenantId) {
        try {
            // Recupera entrambe le foto
            const photos = await query(
                `SELECT id, photo_url, captured_at, angle, ai_body_fat_estimate,
                        ai_muscle_notes, ai_overall_assessment
                 FROM progress_photos
                 WHERE id IN (?, ?) AND client_id = ? AND tenant_id = ?
                 ORDER BY captured_at ASC`,
                [photoId1, photoId2, clientId, tenantId]
            );

            if (photos.length !== 2) {
                throw { status: 404, message: 'Una o entrambe le foto non trovate' };
            }

            const [olderPhoto, newerPhoto] = photos;

            // Costruisci prompt per confronto
            const comparisonPrompt = `Confronta queste due foto di progresso dello stesso cliente.

FOTO PRECEDENTE (${this._formatDate(olderPhoto.captured_at)}):
- Angolazione: ${olderPhoto.angle}
- Stima massa grassa: ${olderPhoto.ai_body_fat_estimate || 'N/D'}
- Note muscolari: ${olderPhoto.ai_muscle_notes || 'N/D'}

FOTO ATTUALE (${this._formatDate(newerPhoto.captured_at)}):
- Angolazione: ${newerPhoto.angle}
- Stima massa grassa: ${newerPhoto.ai_body_fat_estimate || 'N/D'}
- Note muscolari: ${newerPhoto.ai_muscle_notes || 'N/D'}

PERIODO: ${this._getDaysDifference(olderPhoto.captured_at, newerPhoto.captured_at)} giorni

Fornisci un confronto dettagliato in formato JSON:
{
  "visibleChanges": "cambiamenti visibili tra le due foto",
  "bodyCompositionChange": "variazione stimata della composizione corporea",
  "muscleGrowth": "sviluppo muscolare osservato",
  "fatLoss": "perdita di grasso osservata",
  "progressRating": "valutazione da 1-10 dei progressi",
  "recommendations": "suggerimenti per i prossimi step"
}

Rispondi in italiano in modo professionale e motivante.`;

            // Analizza prima foto (context)
            const comparisonResponse = await analyzeImage(newerPhoto.photo_url, comparisonPrompt);

            const comparison = this._parseComparisonResponse(comparisonResponse);

            // Salva il confronto
            await this._saveComparison(tenantId, clientId, photoId1, photoId2, comparison, comparisonResponse);

            return {
                olderPhoto: {
                    id: olderPhoto.id,
                    date: olderPhoto.captured_at,
                    angle: olderPhoto.angle
                },
                newerPhoto: {
                    id: newerPhoto.id,
                    date: newerPhoto.captured_at,
                    angle: newerPhoto.angle
                },
                daysBetween: this._getDaysDifference(olderPhoto.captured_at, newerPhoto.captured_at),
                comparison
            };

        } catch (error) {
            logger.error('Errore confronto foto', { error: error.message });

            if (error.status) {
                throw error;
            }

            throw {
                status: 500,
                message: 'Errore durante il confronto delle foto',
                details: error.message
            };
        }
    }

    /**
     * Parsa la risposta del confronto
     * @private
     */
    _parseComparisonResponse(response) {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return {
                visibleChanges: response,
                bodyCompositionChange: 'Vedi cambiamenti visibili',
                muscleGrowth: 'Non determinato',
                fatLoss: 'Non determinato',
                progressRating: 'N/D',
                recommendations: 'Continua il monitoraggio'
            };

        } catch (error) {
            logger.error('Errore parsing confronto', { error: error.message });
            return {
                visibleChanges: response,
                bodyCompositionChange: 'Analisi non disponibile',
                muscleGrowth: 'Analisi non disponibile',
                fatLoss: 'Analisi non disponibile',
                progressRating: 'N/D',
                recommendations: 'Riprova l\'analisi'
            };
        }
    }

    /**
     * Salva il confronto nel database
     * @private
     */
    async _saveComparison(tenantId, clientId, photoId1, photoId2, comparison, rawResponse) {
        await query(
            `INSERT INTO photo_comparisons
             (tenant_id, client_id, photo_id_1, photo_id_2, comparison_date,
              visible_changes, body_composition_change, muscle_growth, fat_loss,
              progress_rating, recommendations, ai_raw_response)
             VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?)`,
            [
                tenantId,
                clientId,
                photoId1,
                photoId2,
                comparison.visibleChanges,
                comparison.bodyCompositionChange,
                comparison.muscleGrowth,
                comparison.fatLoss,
                comparison.progressRating,
                comparison.recommendations,
                rawResponse
            ]
        );
    }

    /**
     * Genera report completo dai progressi fotografici
     * @param {number} clientId
     * @param {string} tenantId
     * @param {Object} options - Opzioni (angle, limit, startDate)
     * @returns {Object} report progressi
     */
    async generatePhotoReport(clientId, tenantId, options = {}) {
        try {
            const { angle = null, limit = 10, startDate = null } = options;

            // Costruisci query dinamica
            let sql = `
                SELECT id, photo_url, angle, captured_at, ai_body_fat_estimate,
                       ai_muscle_notes, ai_posture_notes, ai_overall_assessment,
                       ai_recommendations, notes
                FROM progress_photos
                WHERE client_id = ? AND tenant_id = ? AND ai_analyzed = TRUE
            `;
            const params = [clientId, tenantId];

            if (angle) {
                sql += ' AND angle = ?';
                params.push(angle);
            }

            if (startDate) {
                sql += ' AND captured_at >= ?';
                params.push(startDate);
            }

            sql += ' ORDER BY captured_at ASC LIMIT ?';
            params.push(limit);

            const photos = await query(sql, params);

            if (photos.length === 0) {
                return {
                    totalPhotos: 0,
                    photos: [],
                    trend: null,
                    summary: 'Nessuna foto analizzata disponibile'
                };
            }

            // Analizza trend
            const trend = this._analyzeTrend(photos);

            // Ottieni comparazioni esistenti
            const comparisons = await query(
                `SELECT * FROM photo_comparisons
                 WHERE client_id = ? AND tenant_id = ?
                 ORDER BY comparison_date DESC LIMIT 5`,
                [clientId, tenantId]
            );

            return {
                totalPhotos: photos.length,
                photos: photos.map(p => ({
                    id: p.id,
                    date: p.captured_at,
                    angle: p.angle,
                    bodyFatEstimate: p.ai_body_fat_estimate,
                    muscleNotes: p.ai_muscle_notes,
                    assessment: p.ai_overall_assessment,
                    recommendations: p.ai_recommendations
                })),
                trend,
                comparisons: comparisons.map(c => ({
                    id: c.id,
                    date: c.comparison_date,
                    photoId1: c.photo_id_1,
                    photoId2: c.photo_id_2,
                    progressRating: c.progress_rating,
                    recommendations: c.recommendations
                })),
                summary: this._generateSummary(photos, trend)
            };

        } catch (error) {
            logger.error('Errore generazione report foto', { error: error.message });

            throw {
                status: 500,
                message: 'Errore durante la generazione del report',
                details: error.message
            };
        }
    }

    /**
     * Analizza il trend dai progressi fotografici
     * @private
     */
    _analyzeTrend(photos) {
        if (photos.length < 2) {
            return {
                direction: 'insufficient_data',
                confidence: 'low',
                notes: 'Servono almeno 2 foto per analizzare il trend'
            };
        }

        // Estrai stime numeriche di body fat (se disponibili)
        const bodyFatValues = photos
            .map(p => {
                const estimate = p.ai_body_fat_estimate;
                if (!estimate) return null;

                // Prova a estrarre un numero (es: "15-18%" -> 16.5)
                const match = estimate.match(/(\d+)-(\d+)/);
                if (match) {
                    return (parseInt(match[1]) + parseInt(match[2])) / 2;
                }

                const singleMatch = estimate.match(/(\d+)/);
                if (singleMatch) {
                    return parseInt(singleMatch[1]);
                }

                return null;
            })
            .filter(v => v !== null);

        if (bodyFatValues.length >= 2) {
            const first = bodyFatValues[0];
            const last = bodyFatValues[bodyFatValues.length - 1];
            const change = last - first;

            return {
                direction: change < -1 ? 'improving' : change > 1 ? 'regressing' : 'stable',
                bodyFatChange: change,
                confidence: 'medium',
                notes: `Variazione stimata massa grassa: ${change > 0 ? '+' : ''}${change.toFixed(1)}%`
            };
        }

        return {
            direction: 'unknown',
            confidence: 'low',
            notes: 'Impossibile determinare trend numerico dalle stime disponibili'
        };
    }

    /**
     * Genera un sommario testuale
     * @private
     */
    _generateSummary(photos, trend) {
        const firstPhoto = photos[0];
        const lastPhoto = photos[photos.length - 1];
        const daysBetween = this._getDaysDifference(firstPhoto.captured_at, lastPhoto.captured_at);

        let summary = `Analisi basata su ${photos.length} foto nell'arco di ${daysBetween} giorni. `;

        if (trend.direction === 'improving') {
            summary += 'Progressi visibili positivi. ';
        } else if (trend.direction === 'regressing') {
            summary += 'Trend in peggioramento, rivedere programmazione. ';
        } else if (trend.direction === 'stable') {
            summary += 'Composizione corporea stabile. ';
        }

        if (lastPhoto.ai_recommendations) {
            summary += `Ultima raccomandazione: ${lastPhoto.ai_recommendations}`;
        }

        return summary;
    }

    /**
     * Utility: formatta data
     * @private
     */
    _formatDate(date) {
        return new Date(date).toLocaleDateString('it-IT');
    }

    /**
     * Utility: calcola differenza giorni
     * @private
     */
    _getDaysDifference(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const diffTime = Math.abs(d2 - d1);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    /**
     * Ottieni tutte le foto di un cliente
     */
    async getClientPhotos(clientId, tenantId, options = {}) {
        const { angle = null, limit = 50, offset = 0 } = options;

        let sql = `
            SELECT id, photo_url, angle, captured_at, ai_analyzed,
                   ai_body_fat_estimate, ai_overall_assessment, notes
            FROM progress_photos
            WHERE client_id = ? AND tenant_id = ?
        `;
        const params = [clientId, tenantId];

        if (angle) {
            sql += ' AND angle = ?';
            params.push(angle);
        }

        sql += ' ORDER BY captured_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        return await query(sql, params);
    }

    /**
     * Elimina una foto
     */
    async deletePhoto(photoId, clientId, tenantId) {
        const result = await query(
            'DELETE FROM progress_photos WHERE id = ? AND client_id = ? AND tenant_id = ?',
            [photoId, clientId, tenantId]
        );

        if (result.affectedRows === 0) {
            throw { status: 404, message: 'Foto non trovata' };
        }

        return { success: true };
    }
}

module.exports = new PhotoAnalysisService();
