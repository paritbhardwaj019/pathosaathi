/**
 * Payment Configuration for PathoSaathi
 * Defines payment statuses and related constants
 */

/**
 * Payment status types
 */
export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

/**
 * Payment status array for enum validation
 */
export const PAYMENT_STATUSES = Object.values(PAYMENT_STATUS);

/**
 * Default payment status
 */
export const DEFAULT_PAYMENT_STATUS = PAYMENT_STATUS.PENDING;

/**
 * Check if payment status is completed (paid)
 */
export const isPaymentCompleted = (status: PaymentStatus): boolean => {
  return status === PAYMENT_STATUS.PAID;
};

/**
 * Check if payment status is pending
 */
export const isPaymentPending = (status: PaymentStatus): boolean => {
  return status === PAYMENT_STATUS.PENDING;
};

/**
 * Check if payment status is failed
 */
export const isPaymentFailed = (status: PaymentStatus): boolean => {
  return status === PAYMENT_STATUS.FAILED;
};

/**
 * Check if payment status is refunded
 */
export const isPaymentRefunded = (status: PaymentStatus): boolean => {
  return status === PAYMENT_STATUS.REFUNDED;
};
