import { Link, NavLink } from 'react-router';
import { IconBed } from '../../components/Icons';
import styles from './Reservations.module.css';
import { APP_NAME } from '../../utils/brand';

export default function ReservationsTopbar() {
  const linkClass = ({ isActive }) => [styles['top-link'], isActive ? styles.active : ''].join(' ');

  return (
    <nav className={styles.topbar}>
      <Link to="/habitaciones" className={styles['top-brand']}>
        <IconBed size={20} /> <span className={styles['top-brand-name']}>{APP_NAME}</span>
      </Link>
      <div className={styles['top-links']}>
        <NavLink to="/habitaciones" className={linkClass}>Habitaciones</NavLink>
        <NavLink to="/reservas" className={linkClass}>Mis reservas</NavLink>
        <NavLink to="/perfil" className={linkClass}>Mi perfil</NavLink>
      </div>
    </nav>
  );
}
