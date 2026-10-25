import siteAlpha from './levels/site-alpha.json';
import siteBeta from './levels/site-beta.json';
import siteGamma from './levels/site-gamma.json';
import siteDelta from './levels/site-delta.json';
import siteEpsilon from './levels/site-epsilon.json';
import siteKappa from './levels/site-kappa.json';

// Levels are static, hand-authored JSON files under src/levels/, built (or
// editable) with the level editor at /editor.html — see src/world/levelLoader.js
// for how a file like this becomes the runtime world, and src/tuning.js for
// which of these fields show up as live-editable sliders in the in-game
// Tuning Console.
//
// Order here is also mission order: the level select screen (src/progress.js)
// unlocks each level only once the one before it has been completed.
export const LEVELS = [siteAlpha, siteBeta, siteGamma, siteDelta, siteEpsilon, siteKappa];

export function getLevel(id){
  if (!id) return LEVELS[0];
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

export function getNextLevel(id){
  const idx = LEVELS.findIndex((l) => l.id === id);
  return idx >= 0 && idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}
