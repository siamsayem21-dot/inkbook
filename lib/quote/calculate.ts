// Deterministic quote calculator — no external APIs.
// Swap out calculateQuote() body for AI when ready.

const SIZE_LABEL: Record<string, string> = {
  'Small (under 2")':  'small',
  'Medium (2–4")':    'medium-sized',
  'Large (4–8")':     'large',
  'Extra Large (8"+)': 'extra large',
  'Half Sleeve':       'half sleeve',
  'Full Sleeve':       'full sleeve',
  'Full Back':         'full back',
};

const SIZE_BASE_HOURS: Record<string, [number, number]> = {
  'Small (under 2")':  [1.0,  2.5 ],
  'Medium (2–4")':     [2.5,  5.0 ],
  'Large (4–8")':      [5.0,  9.0 ],
  'Extra Large (8"+)': [8.0,  14.0],
  'Half Sleeve':       [12.0, 18.0],
  'Full Sleeve':       [20.0, 30.0],
  'Full Back':         [25.0, 40.0],
};

const STYLE_MULTIPLIER: Record<string, number> = {
  'Fine Line':      1.00,
  'Geometric':      1.00,
  'Tribal':         1.05,
  'Floral':         1.05,
  'Watercolor':     1.10,
  'Traditional':    1.10,
  'Neo Traditional':1.15,
  'Blackwork':      1.15,
  'Japanese':       1.20,
  'Realism':        1.40,
  'Other':          1.00,
};

const COLOR_MULTIPLIER: Record<string, number> = {
  black_grey: 1.00,
  open:       1.05,
  color:      1.20,
};

const HOURLY_RATE = 175;

export type QuoteResult = {
  priceLow:   number;
  priceHigh:  number;
  sessions:   number;
  hoursRange: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  reasoning:  string;
};

export function calculateQuote(params: {
  size:            string;
  colorPreference: string;
  style:           string | null;
}): QuoteResult {
  const [baseMin, baseMax] = SIZE_BASE_HOURS[params.size] ?? [2.5, 5.0];
  const styleMult = STYLE_MULTIPLIER[params.style ?? 'Other'] ?? 1.0;
  const colorMult = COLOR_MULTIPLIER[params.colorPreference]  ?? 1.0;

  const rawMin  = baseMin * styleMult * colorMult;
  const rawMax  = baseMax * styleMult * colorMult;
  const hoursMin = Math.round(rawMin * 2) / 2;   // round to nearest 0.5
  const hoursMax = Math.round(rawMax * 2) / 2;

  // Round price to nearest $25
  const priceLow  = Math.round(hoursMin * HOURLY_RATE / 25) * 25;
  const priceHigh = Math.round(hoursMax * HOURLY_RATE / 25) * 25;

  const sessions = Math.max(1, Math.round(hoursMax / 5));

  const difficulty: 'Easy' | 'Medium' | 'Hard' =
    hoursMax < 4  ? 'Easy' :
    hoursMax < 10 ? 'Medium' : 'Hard';

  const colorDesc =
    params.colorPreference === 'color'      ? 'full color' :
    params.colorPreference === 'black_grey' ? 'black & grey' : 'mixed color';

  const styleName   = params.style ?? 'custom';
  const sizeLabel   = SIZE_LABEL[params.size] ?? 'custom-sized';
  const sessionText = sessions === 1 ? 'a single session' : `${sessions} sessions`;

  const budgetNote =
    priceLow < 300
      ? ' Adjust upward if the placement or reference adds complexity.'
      : priceHigh > 2000
      ? ' Confirm client is prepared for a multi-session investment before quoting.'
      : '';

  const reasoning =
    `A ${sizeLabel} ${styleName} piece in ${colorDesc} typically runs ` +
    `${hoursMin}–${hoursMax} hours across ${sessionText}. ` +
    `At the studio rate of $${HOURLY_RATE}/hr the realistic range is ` +
    `$${priceLow.toLocaleString('en-US')}–$${priceHigh.toLocaleString('en-US')}. ` +
    `Difficulty is rated ${difficulty} based on size, style complexity, and color requirements.` +
    budgetNote;

  return {
    priceLow,
    priceHigh,
    sessions,
    hoursRange: `${hoursMin}–${hoursMax}`,
    difficulty,
    reasoning,
  };
}
