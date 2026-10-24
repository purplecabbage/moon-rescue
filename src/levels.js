import siteKappa from './levels/site-kappa.json';

// Levels are static, hand-authored JSON files under src/levels/, built (or
// editable) with the level editor at /editor.html — see src/world/levelLoader.js
// for how a file like this becomes the runtime world, and src/tuning.js for
// which of these fields show up as live-editable sliders in the in-game
// Tuning Console.
export const LEVELS = [siteKappa];

export function getLevel(id){
  if (!id) return LEVELS[0];
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}
