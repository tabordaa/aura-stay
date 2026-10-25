import { useState } from 'react';
import { BRAND_LABELS, cardLength, cvvLength, detectBrand, groupCardNumber, onlyDigits } from './cardUtils';
import styles from './CheckoutModal.module.css';

/*
 * Formulario de tarjeta con vista previa.
 * IMPORTANTE: el pago es simulado. Los datos de la tarjeta solo se validan en el
 * navegador y NUNCA se envían al backend. Para cobrar de verdad hay que integrar
 * una pasarela (Wompi, PayU, Mercado Pago...) que tokenice la tarjeta.
 */

export default function PaymentCardForm({ card, setCard, fieldError, touch, disabled }) {
  const [flipped, setFlipped] = useState(false);
  const brand = detectBrand(card.number);
  const maskedNumber = groupCardNumber(card.number.padEnd(cardLength(brand), '•'), brand);

  const update = (field, value) => setCard(c => ({ ...c, [field]: value }));

  const onNumber = (e) => {
    const digits = onlyDigits(e.target.value);
    update('number', digits.slice(0, cardLength(detectBrand(digits))));
  };
  const onName = (e) => update('name', e.target.value.replace(/[^a-zA-ZÀ-ÿñÑ\s]/g, '').slice(0, 26));
  const onExpiry = (e) => {
    const d = onlyDigits(e.target.value).slice(0, 4);
    update('expiry', d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d);
  };
  const onCvv = (e) => update('cvv', onlyDigits(e.target.value).slice(0, cvvLength(brand)));

  const inputClass = (name) => [styles.input, fieldError(name) ? styles['input-error'] : ''].join(' ');

  return (
    <div className={styles['card-form']}>
      {/* Vista previa de la tarjeta */}
      <div className={[styles['card-preview'], flipped ? styles.flipped : ''].join(' ')} aria-hidden="true">
        <div className={styles['card-inner']}>
          <div className={styles['card-front']} data-brand={brand || 'none'}>
            <div className={styles['card-top']}>
              <span className={styles['card-chip']} />
              <span className={styles['card-brand']}>{BRAND_LABELS[brand] || 'Aura Pay'}</span>
            </div>
            <div className={styles['card-number']}>{maskedNumber}</div>
            <div className={styles['card-bottom']}>
              <div>
                <small>Titular</small>
                <span>{card.name.trim().toUpperCase() || 'NOMBRE APELLIDO'}</span>
              </div>
              <div>
                <small>Vence</small>
                <span>{card.expiry || 'MM/AA'}</span>
              </div>
            </div>
          </div>
          <div className={styles['card-back']} data-brand={brand || 'none'}>
            <div className={styles['card-stripe']} />
            <div className={styles['card-sign']}>
              <span />
              <strong>{card.cvv || '•'.repeat(cvvLength(brand))}</strong>
            </div>
            <small className={styles['card-back-note']}>Código de seguridad (CVV)</small>
          </div>
        </div>
      </div>

      {/* Campos */}
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>Número de la tarjeta</span>
          <input
            className={inputClass('cardNumber')}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 5678 9012 3456"
            value={groupCardNumber(card.number, brand)}
            onChange={onNumber}
            onBlur={touch('cardNumber')}
            disabled={disabled}
          />
          {fieldError('cardNumber') && <span className={styles['field-error']}>{fieldError('cardNumber')}</span>}
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Nombre en la tarjeta</span>
          <input
            className={inputClass('cardName')}
            autoComplete="cc-name"
            placeholder="Como aparece impreso"
            value={card.name}
            onChange={onName}
            onBlur={touch('cardName')}
            disabled={disabled}
          />
          {fieldError('cardName') && <span className={styles['field-error']}>{fieldError('cardName')}</span>}
        </label>

        <div className={styles['field-row']}>
          <label className={styles.field}>
            <span className={styles.label}>Vencimiento</span>
            <input
              className={inputClass('cardExpiry')}
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/AA"
              value={card.expiry}
              onChange={onExpiry}
              onBlur={touch('cardExpiry')}
              disabled={disabled}
            />
            {fieldError('cardExpiry') && <span className={styles['field-error']}>{fieldError('cardExpiry')}</span>}
          </label>

          <label className={styles.field}>
            <span className={styles.label}>CVV</span>
            <input
              className={inputClass('cardCvv')}
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={brand === 'amex' ? '4 dígitos' : '3 dígitos'}
              value={card.cvv}
              onChange={onCvv}
              onFocus={() => setFlipped(true)}
              onBlur={(e) => { setFlipped(false); touch('cardCvv')(e); }}
              disabled={disabled}
            />
            {fieldError('cardCvv') && <span className={styles['field-error']}>{fieldError('cardCvv')}</span>}
          </label>
        </div>

        <div className={styles.brands}>
          {Object.entries(BRAND_LABELS).map(([id, label]) => (
            <span key={id} className={[styles['brand-chip'], brand === id ? styles.active : ''].join(' ')}>{label}</span>
          ))}
        </div>

        <p className={styles['demo-note']}>
          Modo prueba: no se hace ningún cobro y la tarjeta no se guarda. Puedes usar <strong>4242 4242 4242 4242</strong>.
        </p>
      </div>
    </div>
  );
}
