import styles from './Loader.module.css';

interface LoaderProps {
  /** 0–1 */
  progress: number;
}

export function Loader({ progress }: LoaderProps) {
  const percent = Math.round(progress * 100);
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <span className={styles.label}>Loading</span>
      <span className={styles.value}>{String(percent).padStart(3, '0')}%</span>
      <span className={styles.bar} style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
