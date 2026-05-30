/** URL path segment (kebab-case). */
export const DataTypePath = {
  oxygenSaturation: "oxygen-saturation",
  dailyOxygenSaturation: "daily-oxygen-saturation",
  heartRate: "heart-rate",
  sleep: "sleep",
  respiratoryRate: "respiratory-rate",
} as const;

/** Filter field prefix (snake_case). */
export const DataTypeFilter = {
  oxygenSaturation: "oxygen_saturation",
  dailyOxygenSaturation: "daily_oxygen_saturation",
  heartRate: "heart_rate",
  sleep: "sleep",
  respiratoryRate: "respiratory_rate",
} as const;

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Filter sample types by physical time within a civil day (UTC midnight bounds). */
export function filterSamplePhysicalDay(filterPrefix: string, date: string): string {
  const next = addDays(date, 1);
  return (
    `${filterPrefix}.sample_time.physical_time >= "${date}T00:00:00Z" AND ` +
    `${filterPrefix}.sample_time.physical_time < "${next}T00:00:00Z"`
  );
}

/** Filter interval types (sleep, steps) by civil start on a given date. */
export function filterIntervalCivilDay(filterPrefix: string, date: string): string {
  const next = addDays(date, 1);
  return (
    `${filterPrefix}.interval.civil_start_time >= "${date}T00:00:00" AND ` +
    `${filterPrefix}.interval.civil_start_time < "${next}T00:00:00"`
  );
}

export function resolveSpikeDate(input: string): string {
  if (input !== "today") {
    return input;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
