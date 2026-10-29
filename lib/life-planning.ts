import { addDays, clock, minutes, occurs, overlaps, validClock, validDay, type EventRow } from "./schedule.ts";

/** Pure, opt-in suggestions: the caller decides whether any change is saved. */
export function alternativeTimes(
  current: EventRow, allEvents: EventRow[], today: string, count = 3,
): { day:string; start_time:string; end_time:string }[] {
  if (!validDay(current.day) || !validDay(today) || !validClock(current.start_time) || !validClock(current.end_time)) return [];
  if (current.repeat_weekly || current.repeat_yearly || current.all_day) return [];
  const duration = minutes(current.end_time) - minutes(current.start_time);
  if (duration <= 0 || duration > 240 || count < 1) return [];
  const suggestions: {day:string;start_time:string;end_time:string}[] = [];
  for (let offset=0;offset<8 && suggestions.length<count;offset++) {
    const day = addDays(current.day < today ? today : current.day,offset);
    const busy = allEvents.filter(e=> e.id!==current.id && !e.all_day && occurs(e,day));
    for (let start=8*60;start+duration<=21*60 && suggestions.length<count;start+=30) {
      const end=start+duration;
      if(day===current.day && start===minutes(current.start_time)) continue;
      if(busy.some(e=>overlaps(start,end,minutes(e.start_time),minutes(e.end_time)))) continue;
      suggestions.push({day,start_time:clock(start),end_time:clock(end)});
    }
  }
  return suggestions;
}

export function categoryCounts(events: EventRow[], fromDay: string, days=7): Record<string,number> {
  const result:Record<string,number>={};
  for(let n=0;n<days;n++){
    const date=addDays(fromDay,n);
    for(const e of events)if(occurs(e,date)){
      const key=e.custom_category_id ? "custom:"+e.custom_category_id : e.category;
      result[key]=(result[key]||0)+1;
    }
  }
  return result;
}
