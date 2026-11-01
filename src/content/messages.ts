/**
 * Site copy, grouped into scenes. Lines starting with "!" are hit moments:
 * strip the "!" (see `parseLine`) and give them the big stamp/glitch treatment.
 */
export interface Scene {
  id: string;
  lines: readonly string[];
}

export const scenes = [
  { id: 'wake', lines: ['Sucker', "Yeah, you, scrolling like it's a rule."] },
  {
    id: 'city',
    lines: [
      'Concrete sky.',
      'Neon bleeding through the cracks.',
      'The city hums one song:',
      'sit down, shut up, fit in.',
      '!WE NEVER LEARNED THE WORDS.',
    ],
  },
  {
    id: 'crew',
    lines: [
      'We are the static between stations.',
      'The misprint. The broken string.',
      'Safety pins holding our hearts together',
      'because glue cost too much.',
      '!WE HOLD ANYWAY.',
    ],
  },
  {
    id: 'noise',
    lines: [
      'Three chords.',
      'One cheap amp.',
      'A garage that smells like rust and rain.',
      "That's not a band.",
      "!THAT'S A RIOT WITH A SETLIST.",
    ],
  },
  {
    id: 'wall',
    lines: [
      'They painted every wall grey.',
      'We brought the spray cans.',
      'Every tag screams the same thing:',
      '!WE WERE HERE.',
      '!WE ARE STILL HERE.',
    ],
  },
  {
    id: 'fall',
    lines: [
      'Fell hard?',
      'Good.',
      'Now you know where the floor is.',
      'Spit out the dust.',
      '!GET UP LOUDER.',
    ],
  },
  {
    id: 'rip',
    lines: [
      'No masters.',
      'No mirrors telling you who to be.',
      'Rip the pattern.',
      'Stitch your own.',
      '!WEAR IT LIKE A WARNING.',
    ],
  },
  {
    id: 'home',
    lines: [
      'They told us to turn it down.',
      'We ripped the knob off.',
      "Scroll away if you're scared.",
      "Stay if you're loud.",
      '...',
      'You stayed.',
      '!WELCOME HOME, MISFIT.',
    ],
  },
] as const satisfies readonly Scene[];

export type SceneId = (typeof scenes)[number]['id'];

/** Lines `start`…`end` (exclusive) of a scene — same semantics as `Array.prototype.slice`. */
export function getLines(sceneId: SceneId, start: number, end?: number): readonly string[] {
  const scene = scenes.find((s) => s.id === sceneId);
  if (!scene) throw new Error(`Unknown scene: ${sceneId}`);
  return scene.lines.slice(start, end);
}

export interface ParsedLine {
  text: string;
  /** True for "!" hit lines. */
  hit: boolean;
}

export function parseLine(line: string): ParsedLine {
  return line.startsWith('!') ? { text: line.slice(1), hit: true } : { text: line, hit: false };
}
