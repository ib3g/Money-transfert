export class AppError extends Error {
  constructor(code, message, statusCode = 400, details = undefined) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
  }
}

export const Errors = {
  // Auth
  INVALID_CREDENTIALS:     () => new AppError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect', 401),
  INVALID_TOTP:            () => new AppError('INVALID_TOTP', 'Code A2F incorrect', 401),
  TOTP_NOT_CONFIGURED:     () => new AppError('TOTP_NOT_CONFIGURED', 'A2F non configurée', 403),
  TOTP_ALREADY_ENABLED:    () => new AppError('TOTP_ALREADY_ENABLED', 'A2F déjà activée', 409),
  SESSION_EXPIRED:         () => new AppError('SESSION_EXPIRED', 'Session expirée', 401),
  UNAUTHORIZED:            () => new AppError('UNAUTHORIZED', 'Non authentifié', 401),
  FORBIDDEN:               () => new AppError('FORBIDDEN', 'Accès refusé', 403),
  FORBIDDEN_OWNER:         () => new AppError('FORBIDDEN_OWNER', 'Impossible de modifier le owner', 403),
  PERMISSION_DENIED:       (p) => new AppError('PERMISSION_DENIED', `Permission requise : ${p}`, 403),

  // Users
  USER_NOT_FOUND:          () => new AppError('USER_NOT_FOUND', 'Utilisateur introuvable', 404),
  EMAIL_ALREADY_EXISTS:    () => new AppError('EMAIL_ALREADY_EXISTS', 'Cet email est déjà utilisé', 409),
  USER_INACTIVE:           () => new AppError('USER_INACTIVE', 'Ce compte est désactivé', 403),

  // Zones
  ZONE_NOT_FOUND:          () => new AppError('ZONE_NOT_FOUND', 'Zone introuvable', 404),
  ZONE_NAME_EXISTS:        () => new AppError('ZONE_NAME_EXISTS', 'Une zone avec ce nom existe déjà', 409),

  // Rates
  RATE_NOT_FOUND:          () => new AppError('RATE_NOT_FOUND', 'Aucun taux pour ce corridor', 404),
  NO_RATE_FOR_CORRIDOR:    () => new AppError('NO_RATE_FOR_CORRIDOR', 'Aucun taux de change défini pour ce corridor', 422),

  // Transactions
  TRANSACTION_NOT_FOUND:   () => new AppError('TRANSACTION_NOT_FOUND', 'Transaction introuvable', 404),
  INVALID_CODE:            () => new AppError('INVALID_CODE', 'Code de retrait invalide', 404),
  ALREADY_CONFIRMED:       () => new AppError('ALREADY_CONFIRMED', 'Cette transaction a déjà été confirmée', 409),
  ALREADY_CANCELLED:       () => new AppError('ALREADY_CANCELLED', 'Cette transaction est déjà annulée', 409),
  TRANSACTION_NOT_PENDING: () => new AppError('TRANSACTION_NOT_PENDING', 'Seules les transactions en attente peuvent être modifiées', 422),
  SAME_ZONE:               () => new AppError('SAME_ZONE', 'La zone source et destination ne peuvent pas être identiques', 422),
  CANNOT_CANCEL:           () => new AppError('CANNOT_CANCEL', 'Vous ne pouvez pas annuler cette transaction', 403),

  // Generic
  NOT_FOUND:               (r) => new AppError('NOT_FOUND', `${r ?? 'Ressource'} introuvable`, 404),
  VALIDATION:              (d) => new AppError('VALIDATION_ERROR', 'Données invalides', 400, d),
  INTERNAL:                () => new AppError('INTERNAL_ERROR', 'Erreur serveur interne', 500),
};
