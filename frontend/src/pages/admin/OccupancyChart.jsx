import { useMemo, useState } from 'react';
import { formatStayDate, formatWeekdayDay } from '../../utils/dates';
import styles from './Admin.module.css';

// Texto único para tooltip y etiqueta accesible de cada noche
function formatDaySummary(day) {
  const unitsLabel = day.total === 1 ? 'unidad' : 'unidades';
  const arrivalsLabel = day.arrivals === 1 ? 'llegada' : 'llegadas';
  const departuresLabel = day.departures === 1 ? 'salida' : 'salidas';
  return `${formatStayDate(day.date)} · ${day.occupied} de ${day.total} ${unitsLabel} (${day.pct} %) · ${day.arrivals} ${arrivalsLabel} · ${day.departures} ${departuresLabel}`;
}

export default function OccupancyChart({ data = [], loading = false, error = false }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const { averagePct, peakIndex, adjacentClosePeak } = useMemo(() => {
    if (data.length === 0) return { averagePct: 0, peakIndex: -1, adjacentClosePeak: false };
    const totalPct = data.reduce((sum, d) => sum + d.pct, 0);
    const avg = Math.round(totalPct / data.length);
    const maxPct = data.reduce((max, d) => Math.max(max, d.pct), 0);
    const peak = maxPct > 0 ? data.findIndex((d) => d.pct === maxPct) : -1;
    // Evita que la etiqueta del pico se encime con la de hoy en pantallas estrechas
    const closePeak = peak === 1 && Math.abs(data[1].pct - data[0].pct) < 14;
    return { averagePct: avg, peakIndex: peak, adjacentClosePeak: closePeak };
  }, [data]);

  const hasData = data.length > 0;
  const activeDay = activeIndex !== null ? data[activeIndex] ?? null : null;
  const activeSummary = activeDay ? formatDaySummary(activeDay) : '';

  const tooltipAlignClass = activeIndex === null
    ? ''
    : activeIndex <= 3
      ? styles['occ-tooltip-left']
      : activeIndex >= data.length - 4
        ? styles['occ-tooltip-right']
        : styles['occ-tooltip-center'];

  const tooltipStyle = activeIndex !== null && activeIndex > 3 && activeIndex < data.length - 4
    ? { '--occ-tip-x': `${((activeIndex + 0.5) / data.length) * 100}%` }
    : undefined;

  return (
    <section className={styles.panel} aria-labelledby="occ-chart-title">
      <div className={styles['occ-head']}>
        <h2 id="occ-chart-title" className={styles['occ-title']}>Ocupación · próximos 14 días</h2>
        {hasData && (
          <span className={styles['occ-avg']}>
            Promedio <strong>{averagePct} %</strong>
          </span>
        )}
      </div>

      {loading && !hasData ? (
        <p className={styles['occ-state']}>Cargando ocupación…</p>
      ) : error && !hasData ? (
        <p className={styles['occ-state']}>No pudimos cargar la ocupación. Intenta actualizar.</p>
      ) : !hasData ? (
        <p className={styles['occ-state']}>Sin datos de ocupación disponibles.</p>
      ) : (
        <div
          className={[styles['occ-figure'], loading ? styles['occ-loading'] : ''].join(' ')}
          role="figure"
          aria-label={`Ocupación prevista para los próximos ${data.length} días, promedio ${averagePct} por ciento`}
        >
          <div className={styles['occ-chart']}>
            {/* Etiquetas recesivas del eje Y alineadas con la cuadrícula */}
            <div className={styles['occ-yaxis']} aria-hidden="true">
              <span className={styles['occ-ytick-100']}>100 %</span>
              <span className={styles['occ-ytick-50']}>50 %</span>
              <span className={styles['occ-ytick-0']}>0 %</span>
            </div>

            <div className={styles['occ-plot-wrap']}>
              {activeDay && (
                <div
                  id="occ-tooltip"
                  role="tooltip"
                  className={[styles['occ-tooltip'], tooltipAlignClass].join(' ')}
                  style={tooltipStyle}
                >
                  {activeSummary}
                </div>
              )}

              <div className={styles['occ-plot']}>
                {/* Líneas guía en 100, 50 y 0 % */}
                <div className={styles['occ-grid']} aria-hidden="true">
                  <span className={styles['occ-grid-100']} />
                  <span className={styles['occ-grid-50']} />
                  <span className={styles['occ-grid-0']} />
                </div>

                <div className={styles['occ-bars']} style={{ '--occ-cols': data.length }}>
                  {data.map((day, i) => {
                    const isToday = i === 0;
                    const isPeak = i === peakIndex;
                    const showVal = isToday || isPeak;
                    const isActive = activeIndex === i;
                    const barHeight = Math.min(100, Math.max(0, day.pct));
                    const summary = formatDaySummary(day);

                    return (
                      <button
                        key={day.date}
                        type="button"
                        className={[
                          styles['occ-col'],
                          isToday ? styles['occ-col-today'] : '',
                          isActive ? styles['occ-col-active'] : '',
                        ].join(' ')}
                        aria-label={isToday ? `Hoy, ${summary}` : summary}
                        aria-describedby={isActive ? 'occ-tooltip' : undefined}
                        onMouseEnter={() => setActiveIndex(i)}
                        onMouseLeave={() => setActiveIndex((curr) => (curr === i ? null : curr))}
                        onFocus={() => setActiveIndex(i)}
                        onBlur={() => setActiveIndex((curr) => (curr === i ? null : curr))}
                        onKeyDown={(e) => { if (e.key === 'Escape') setActiveIndex(null); }}
                      >
                        <span className={styles['occ-bar-area']} aria-hidden="true">
                          {showVal && (
                            <span
                              className={[
                                styles['occ-val'],
                                isPeak && adjacentClosePeak ? styles['occ-val-lifted'] : '',
                              ].join(' ')}
                              style={{ bottom: `calc(${barHeight}% + 5px)`, '--occ-i': i }}
                            >
                              {day.pct} %
                            </span>
                          )}
                          <span
                            className={[
                              styles['occ-bar'],
                              isToday ? styles['occ-bar-today'] : '',
                              barHeight > 0 ? styles['occ-bar-nonzero'] : '',
                            ].join(' ')}
                            style={{ height: `${barHeight}%`, '--occ-i': i }}
                          />
                        </span>
                        <span
                          className={[
                            styles['occ-xlabel'],
                            i % 2 === 1 ? styles['occ-xlabel-alt'] : '',
                          ].join(' ')}
                          aria-hidden="true"
                        >
                          {formatWeekdayDay(day.date)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla equivalente oculta visualmente para lectores de pantalla */}
          <table className={styles['sr-only']}>
            <caption>Ocupación prevista para los próximos {data.length} días</caption>
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Ocupadas</th>
                <th scope="col">Total</th>
                <th scope="col">Ocupación</th>
              </tr>
            </thead>
            <tbody>
              {data.map((day) => (
                <tr key={day.date}>
                  <td>{formatStayDate(day.date)}</td>
                  <td>{day.occupied}</td>
                  <td>{day.total}</td>
                  <td>{day.pct} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
