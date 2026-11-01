import styles from './SoundToggle.module.css';

interface SoundToggleProps {
  playing: boolean;
  onToggle: () => void;
}

/** Corner button: animated equalizer bars while music plays. */
export function SoundToggle({ playing, onToggle }: SoundToggleProps) {
  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={onToggle}
      aria-pressed={playing}
      aria-label={playing ? 'Turn sound off' : 'Turn sound on'}
      data-playing={playing || undefined}
      data-sound-toggle
    >
      <span className={styles.bars} aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </span>
      <span className={styles.label}>{playing ? 'Sound on' : 'Sound off'}</span>
    </button>
  );
}
