interface SliderChangeResult {
  message: string;
  hasChanges: boolean;
}

type Distribution = Record<string, number>;

export function calcSliderChangeResult(
  current: Distribution,
  old: Distribution
): SliderChangeResult {
  let valueChange = 0.0;
  let tokensChanged = 0;
  let tokensTotal = 0;
  Object.entries(current).forEach((entry) => {
    const original = old[entry[0]] ?? 0.0;
    if (entry[1] > 0 || original > 0) {
      valueChange += Math.abs(entry[1] - original);
      tokensTotal++;
      if (entry[1] != original) {
        tokensChanged++;
      }
    }
  });
  return {
    hasChanges: tokensChanged > 0,
    message: `${tokensChanged} / ${tokensTotal} changed, ${valueChange.toFixed(
      1
    )} % total portfolio adjustment.`,
  };
}
