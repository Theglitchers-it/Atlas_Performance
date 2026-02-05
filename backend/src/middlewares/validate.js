/**
 * Middleware Validazione Input con Joi
 */

/**
 * Crea middleware di validazione
 * @param {Object} schema - Schema Joi
 * @param {string} property - Proprietà da validare (body, query, params)
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Mostra tutti gli errori
            stripUnknown: true // Rimuove campi non definiti nello schema
        });

        if (error) {
            const errors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, '')
            }));

            return res.status(400).json({
                success: false,
                message: 'Dati non validi',
                errors
            });
        }

        // Sostituisce con i dati validati e sanitizzati
        req[property] = value;
        next();
    };
};

module.exports = { validate };
