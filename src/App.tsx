import { BackgroundMusic } from './features/audio';
import { IntroSequence } from './features/intro';
import { AfterIntro } from './sections/AfterIntro';

export function App() {
  return (
    <main>
      <IntroSequence />
      <AfterIntro />
      <BackgroundMusic />
    </main>
  );
}
