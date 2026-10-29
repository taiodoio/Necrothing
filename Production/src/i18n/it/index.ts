// Tutti i testi italiani, un file per area (le chiavi non si ripetono tra aree).

import app from './app.ts';
import catalog from './catalog.ts';
import game from './game.ts';
import screens from './screens.ts';
import ui from './ui.ts';

export const IT: Record<string, string> = { ...catalog, ...game, ...screens, ...app, ...ui };
