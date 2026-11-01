import { SoundToggle } from './SoundToggle';
import { useBackgroundMusic } from './useBackgroundMusic';

/** Looping background track plus its on/off control. */
export function BackgroundMusic() {
  const { playing, toggle } = useBackgroundMusic();
  return <SoundToggle playing={playing} onToggle={toggle} />;
}
