import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .messages({
      'string.min': 'Name cannot be empty',
      'string.max': 'Name must be less than 100 characters',
    }),
  bio: Joi.string()
    .trim()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Bio must be less than 500 characters',
    }),
  emailNotifications: Joi.object({
    newPrediction: Joi.boolean(),
    hitNotification: Joi.boolean(),
    newsletter: Joi.boolean(),
  }),
}).min(1); // 少なくとも1つのフィールドが必要

export const deleteAccountSchema = Joi.object({
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required to delete account',
    }),
  confirmation: Joi.string()
    .valid('DELETE')
    .messages({
      'any.only': 'Please type DELETE to confirm',
    }),
});