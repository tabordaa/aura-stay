/*
 * Utilidades de la tarjeta (validación y formato).
 * El pago es simulado: los datos de la tarjeta solo se validan en el navegador
 * y NUNCA se envían al backend.
 */

export const BRAND_LABELS = { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express' };

export const onlyDigits = (value) => value.replace(/\D/g, '');

export function detectBrand(digits) {
  if (/^4/.test(digits)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'mastercard';
  if (/^3[47]/.test(digits)) return 'amex';
  return '';
}

export const cardLength = (brand) => (brand === 'amex' ? 15 : 16);
export const cvvLength  = (brand) => (brand === 'amex' ? 4 : 3);

// Agrupa los caracteres como se ven en la tarjeta: 4-4-4-4 o 4-6-5 para Amex
export function groupCardNumber(value, brand) {
  const groups = brand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
  const out = [];
  let i = 0;
  for (const size of groups) {
    if (i >= value.length) break;
    out.push(value.slice(i, i + size));
    i += size;
  }
  return out.join(' ');
}

// Algoritmo de Luhn: detecta números de tarjeta mal escritos
function luhnValid(digits) {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = Number(digits[i]);
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateCard(card, now = new Date()) {
  const errors = {};
  const brand = detectBrand(card.number);

  if (!card.number) {
    errors.cardNumber = 'Ingresa el número de la tarjeta';
  } else if (!brand) {
    errors.cardNumber = 'Aceptamos Visa, Mastercard y American Express';
  } else if (card.number.length !== cardLength(brand) || !luhnValid(card.number)) {
    errors.cardNumber = 'El número de la tarjeta no es válido';
  }

  if (card.name.trim().length < 3) {
    errors.cardName = 'Escribe el nombre como aparece en la tarjeta';
  }

  const match = card.expiry.match(/^(\d{2})\/(\d{2})$/);
  if (!match) {
    errors.cardExpiry = 'Usa el formato MM/AA';
  } else {
    const month = Number(match[1]);
    const year = 2000 + Number(match[2]);
    const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    if (month < 1 || month > 12) errors.cardExpiry = 'El mes debe estar entre 01 y 12';
    else if (expired) errors.cardExpiry = 'Esta tarjeta está vencida';
    else if (year > now.getFullYear() + 20) errors.cardExpiry = 'Revisa el año de vencimiento';
  }

  if (card.cvv.length !== cvvLength(brand)) {
    errors.cardCvv = `El CVV tiene ${cvvLength(brand)} dígitos`;
  }

  return errors;
}
