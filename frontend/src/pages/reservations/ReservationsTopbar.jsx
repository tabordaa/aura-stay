import { Link, NavLink } from 'react-router';
import { IconBed } from '../../components/Icons';
import styles from './Reservations.module.css';

export default function ReservationsTopbar() {
  const linkClass = ({ isActive }) => [styles['top-link'], isActive ? styles.active : ''].join(' ');

  return (
    <nav className={styles.topbar}>
      <Link to="/habitaciones" className={styles['top-brand']}>
        <IconBed size={20} /> <span className={styles['top-brand-name']}>{import.meta.env.VITE_APP_NAME || 'Aura Stay'}</span>
      </Link>
      <div className={styles['top-links']}>
        <NavLink to="/habitaciones" className={linkClass}>Habitaciones</NavLink>
        <NavLink to="/reservas" className={linkClass}>Mis reservas</NavLink>
        <NavLink to="/perfil" className={linkClass}>Mi perfil</NavLink>
      </div>
    </nav>
  );
}
