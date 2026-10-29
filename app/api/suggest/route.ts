import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { sql } from "@/lib/database";
import { validClock, validDay, suggestedSlots, EventRow, TaskRow } from "@/lib/schedule";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    const { data } = await auth.getSession();
    const uid = data?.user?.id;
    if (!uid) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    const body = await request.json();
    const today = body.today, time = body.time;
    const taskId = String(body.taskId || "");
    if (!validDay(today) || !validClock(time)) return NextResponse.json({ error: "Data ou horário inválido." }, { status: 400 });
    const tasks = await sql`SELECT id, title, due_date::text, status, duration_minutes FROM nexo_tasks WHERE id=${taskId} AND user_id=${uid}`;
    if (!tasks.length) return NextResponse.json({ error: "Tarefa não encontrada." }, { status: 404 });
    const events = await sql`SELECT id, title, day::text, to_char(start_time,'HH24:MI') AS start_time, to_char(end_time,'HH24:MI') AS end_time, category, repeat_weekly, repeat_yearly, all_day, task_id FROM nexo_events WHERE user_id=${uid}`;
    const slots = suggestedSlots(tasks[0] as TaskRow, events as EventRow[], today, time);
    const planned = (events as EventRow[]).filter(e => e.task_id === taskId).reduce((sum, e) => {
      const [a,b] = [e.start_time,e.end_time].map(t => Number(t.slice(0,2))*60+Number(t.slice(3,5)));
      return sum+b-a;
    },0);
    return NextResponse.json({ slots, plannedMinutes: planned, remainingMinutes: Math.max(0, Number(tasks[0].duration_minutes)-planned) });
  } catch(e) {
    console.error("nexo/suggest", e);
    return NextResponse.json({ error: "Não foi possível calcular horários agora." }, { status: 500 });
  }
}
