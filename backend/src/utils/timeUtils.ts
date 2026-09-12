export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function addMinutesToTime(timeStr: string, durationMinutes: number): string {
  const startMins = timeToMinutes(timeStr);
  return minutesToTime(startMins + durationMinutes);
}

export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);

  return sA < eB && eA > sB;
}

export function formatDuration(durationMinutes: number): string {
  const hours = durationMinutes / 60;
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
}

export const DAY_ORDER_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
};

export const DEFAULT_ACADEMIC_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function sortTimeSlots<T extends { day: string; startTime?: string; endTime?: string; slotOrder?: number }>(slots: T[]): T[] {
  return [...slots].sort((a, b) => {
    const dayDiff = (DAY_ORDER_MAP[a.day] ?? 99) - (DAY_ORDER_MAP[b.day] ?? 99);
    if (dayDiff !== 0) return dayDiff;
    if (a.startTime && b.startTime) {
      const timeDiff = a.startTime.localeCompare(b.startTime);
      if (timeDiff !== 0) return timeDiff;
    }
    if (a.endTime && b.endTime) {
      const endDiff = a.endTime.localeCompare(b.endTime);
      if (endDiff !== 0) return endDiff;
    }
    return (a.slotOrder ?? 0) - (b.slotOrder ?? 0);
  });
}

