import { koreanHoliday } from "./korean-holidays.mjs";

/** Select the recurring schedule for a Seoul calendar date without changing past records. */
export function routinesForDate(routines, date, schedule = {}) {
  if (!date || !schedule.startsOn) return routines;
  if (date < schedule.startsOn) return routines.filter((r) => !schedule.newIds?.includes(r.id));
  const holiday = koreanHoliday(date);
  const day = new Date(`${date}T12:00:00+09:00`).getUTCDay();
  return routines.filter((routine) => {
    if (schedule.holidayIds?.includes(routine.id)) return Boolean(holiday);
    if (holiday && schedule.holidayIds) return schedule.holidaySharedIds?.includes(routine.id) ?? false;
    const days = schedule.days?.[routine.id];
    return !days || days.includes(day);
  });
}

export function routineDayLabel(date) {
  const holiday = koreanHoliday(date);
  if (holiday) return `${holiday} · 공휴일`;
  const day = new Date(`${date}T12:00:00+09:00`).getUTCDay();
  return day === 6 ? "토요일" : day === 0 ? "일요일" : "평일";
}
