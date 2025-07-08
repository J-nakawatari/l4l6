import Joi from 'joi';

export const createCheckoutSchema = Joi.object({
  priceId: Joi.string()
    .required()
    .pattern(/^price_/)
    .messages({
      'any.required': 'Price ID is required',
      'string.pattern.base': 'Invalid price ID format',
    }),
  successUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'any.required': 'Success URL is required',
      'string.uri': 'Success URL must be a valid URL',
    }),
  cancelUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'any.required': 'Cancel URL is required',
      'string.uri': 'Cancel URL must be a valid URL',
    }),
});

export const createPortalSchema = Joi.object({
  returnUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'any.required': 'Return URL is required',
      'string.uri': 'Return URL must be a valid URL',
    }),
});

export const cancelSubscriptionSchema = Joi.object({
  reason: Joi.string()
    .valid('too_expensive', 'missing_features', 'not_useful', 'other')
    .messages({
      'any.only': 'Invalid cancellation reason',
    }),
  feedback: Joi.string()
    .max(1000)
    .messages({
      'string.max': 'Feedback must be less than 1000 characters',
    }),
  immediate: Joi.boolean()
    .default(false),
});