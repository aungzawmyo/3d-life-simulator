import { daysInMonth } from "./math";
import type { ClockState, LifeStage, SimSpeed } from "./types";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function createClock(year: number, month: number, day: number, speed: SimSpeed = 0): ClockState {
  const weekday = new Date(year, month - 1, day).getDay();
  return {
    year,
    month,
    day,
    hour: 7,
    minute: 0,
    weekday,
    totalMinutes: 0,
    speed,
  };
}

export function isWeekend(clock: ClockState): boolean {
  return clock.weekday === 0 || clock.weekday === 6;
}

export function isNight(clock: ClockState): boolean {
  return clock.hour >= 22 || clock.hour < 6;
}

export function isWorkHours(clock: ClockState): boolean {
  return !isWeekend(clock) && clock.hour >= 9 && clock.hour < 17;
}

export function isSchoolHours(clock: ClockState): boolean {
  return !isWeekend(clock) && clock.hour >= 8 && clock.hour < 15;
}

export function formatClock(clock: ClockState): string {
  const hh = String(clock.hour).padStart(2, "0");
  const mm = String(clock.minute).padStart(2, "0");
  return `${WEEKDAYS[clock.weekday]} ${clock.year}-${String(clock.month).padStart(2, "0")}-${String(clock.day).padStart(2, "0")} ${hh}:${mm}`;
}

export function lifeStage(ageYears: number): LifeStage {
  if (ageYears < 6) return "early_childhood";
  if (ageYears < 13) return "childhood";
  if (ageYears < 18) return "adolescence";
  if (ageYears < 26) return "young_adult";
  if (ageYears < 41) return "adulthood";
  if (ageYears < 61) return "midlife";
  return "elder";
}

export function advanceMinutes(clock: ClockState, minutes: number): {
  crossedHour: boolean;
  crossedDay: boolean;
  crossedMonth: boolean;
  crossedYear: boolean;
} {
  let crossedHour = false;
  let crossedDay = false;
  let crossedMonth = false;
  let crossedYear = false;

  clock.totalMinutes += minutes;
  clock.minute += minutes;

  while (clock.minute >= 60) {
    clock.minute -= 60;
    clock.hour += 1;
    crossedHour = true;
    if (clock.hour >= 24) {
      clock.hour = 0;
      clock.day += 1;
      clock.weekday = (clock.weekday + 1) % 7;
      crossedDay = true;
      const dim = daysInMonth(clock.year, clock.month);
      if (clock.day > dim) {
        clock.day = 1;
        clock.month += 1;
        crossedMonth = true;
        if (clock.month > 12) {
          clock.month = 1;
          clock.year += 1;
          crossedYear = true;
        }
      }
    }
  }

  return { crossedHour, crossedDay, crossedMonth, crossedYear };
}
