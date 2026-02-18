/**
 * Validators per autenticazione
 */

const Joi = require('joi');

const registerSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.email': 'Email non valida',
            'any.required': 'Email obbligatoria'
        }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'La password deve avere almeno 8 caratteri',
            'string.pattern.base': 'La password deve contenere almeno una maiuscola, una minuscola e un numero',
            'any.required': 'Password obbligatoria'
        }),
    firstName: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Il nome deve avere almeno 2 caratteri',
            'any.required': 'Nome obbligatorio'
        }),
    lastName: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Il cognome deve avere almeno 2 caratteri',
            'any.required': 'Cognome obbligatorio'
        }),
    phone: Joi.string()
        .pattern(/^[\d\s+\-().]+$/)
        .allow('', null)
        .messages({
            'string.pattern.base': 'Numero di telefono non valido'
        }),
    businessName: Joi.string()
        .min(2)
        .max(255)
        .required()
        .messages({
            'string.min': 'Il nome attività deve avere almeno 2 caratteri',
            'any.required': 'Nome attività obbligatorio'
        }),
    role: Joi.string()
        .valid('tenant_owner', 'client')
        .default('tenant_owner')
});

const loginSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.email': 'Email non valida',
            'any.required': 'Email obbligatoria'
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password obbligatoria'
        })
});

const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            'any.required': 'Refresh token obbligatorio'
        })
});

const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.email': 'Email non valida',
            'any.required': 'Email obbligatoria'
        })
});

const resetPasswordSchema = Joi.object({
    token: Joi.string()
        .required()
        .messages({
            'any.required': 'Token obbligatorio'
        }),
    password: Joi.string()
        .min(8)
        .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .required()
        .messages({
            'string.min': 'La password deve avere almeno 8 caratteri',
            'string.pattern.base': 'La password deve contenere almeno una maiuscola, una minuscola e un numero',
            'any.required': 'Password obbligatoria'
        })
});

module.exports = {
    registerSchema,
    loginSchema,
    refreshTokenSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};
