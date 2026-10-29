import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-server";
import { sql } from "@/lib/database";
import { EventRow, occurs, potentialEventConflicts, validClock, validDay, minutes } from "@/lib/schedule";

import { isDefaultCategory, validCategoryName, validCategoryColor, validCategoryIcon, taskCategory } from "@/lib/categories";

export const runtime = "nodejs";
const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

async function currentUser() {
  const { data } = await auth.getSession();
  return data?.user?.id || null;
}

export async function GET() {
  try {
    const uid = await currentUser();
    if (!uid) return err("Acesse sua conta para continuar.", 401);
    const [subjects, tasks, events, categories] = await Promise.all([
      sql`SELECT id, name, color FROM nexo_subjects WHERE user_id=${uid} ORDER BY created_at ASC`,
      sql`SELECT id, title, notes, subject_id, due_date::text, duration_minutes, priority, status,
        COALESCE(category, CASE WHEN subject_id IS NOT NULL THEN 'study' ELSE 'personal' END) AS category, custom_category_id FROM nexo_tasks WHERE user_id=${uid} ORDER BY due_date, created_at`,
      sql`SELECT id, title, day::text, to_char(start_time,'HH24:MI') AS start_time, to_char(end_time,'HH24:MI') AS end_time, COALESCE(category_key,category) AS category, custom_category_id, repeat_weekly, repeat_yearly, all_day, task_id FROM nexo_events WHERE user_id=${uid} ORDER BY day, start_time`,
      sql`SELECT id, name, color, icon FROM nexo_categories WHERE user_id=${uid} ORDER BY created_at, name`
    ]);
    return NextResponse.json({ subjects, tasks, events, categories });
  } catch (e) {
    console.error("nexo/data/get", e);
    return err("Não foi possível carregar seus dados. Tente novamente.", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const uid = await currentUser();
    if (!uid) return err("Sessão expirada. Entre novamente.", 401);
    const body = await request.json();
    const action = String(body?.action || "");
    if (action === "createSubject") {
      const name = String(body.name || "").trim();
      const color = String(body.color || "#665FEB");
      if (name.length < 2 || name.length > 100 || !/^#[0-9a-fA-F]{6}$/.test(color)) return err("Informe um nome e uma cor válidos.");
      const rows = await sql`INSERT INTO nexo_subjects(user_id,name,color) VALUES(${uid},${name},${color}) RETURNING id`;
      return NextResponse.json({ id: rows[0].id });
    }
    if (action === "createCategory" || action === "editCategory") {
      const name = String(body.name || "").trim();
      const color = String(body.color || "#8E939D");
      const icon = String(body.icon || "tag");
      if (!validCategoryName(name) || !validCategoryColor(color) || !validCategoryIcon(icon)) return err("Revise os dados da categoria.");
      if (action === "editCategory") {
        const id = String(body.id || "");
        const rows = await sql`UPDATE nexo_categories SET name=${name},color=${color},icon=${icon},updated_at=now() WHERE id=${id} AND user_id=${uid} RETURNING id`;
        return rows.length ? NextResponse.json({id:rows[0].id}) : err("Categoria não encontrada.",404);
      }
      const existing = await sql`SELECT id FROM nexo_categories WHERE user_id=${uid} AND lower(name)=lower(${name})`;
      if (existing.length) return err("Você já possui uma categoria com esse nome.",409);
      const rows = await sql`INSERT INTO nexo_categories(user_id,name,color,icon) VALUES(${uid},${name},${color},${icon}) RETURNING id`;
      return NextResponse.json({id:rows[0].id});
    }
    if (action === "createTask") {
      const title = String(body.title || "").trim();
      const notes = String(body.notes || "").trim();
      const due = body.dueDate;
      const duration = Number(body.durationMinutes);
      const priority = String(body.priority || "medium");
      const subjectId = body.subjectId || null;
      const category = String(body.category || (subjectId ? "study" : "personal"));
      const customCategoryId = body.customCategoryId ? String(body.customCategoryId) : null;
      if (!isDefaultCategory(category) || (customCategoryId && category !== "other")) return err("Categoria da tarefa inválida.");
      if (customCategoryId) {
        const allowed = await sql`SELECT id FROM nexo_categories WHERE id=${customCategoryId} AND user_id=${uid}`;
        if (!allowed.length) return err("Categoria personalizada não encontrada.",404);
      }
      if (!title || title.length > 180 || notes.length > 1000 || !validDay(due) || !Number.isInteger(duration) || duration < 15 || duration > 600 || !["low","medium","high"].includes(priority)) return err("Revise os dados da tarefa.");
      if (subjectId) {
        const allowed = await sql`SELECT id FROM nexo_subjects WHERE id=${subjectId} AND user_id=${uid}`;
        if (!allowed.length) return err("Disciplina não encontrada.", 404);
      }
      const rows = await sql`INSERT INTO nexo_tasks(user_id,title,notes,due_date,duration_minutes,priority,subject_id,category,custom_category_id)
        VALUES(${uid},${title},${notes},${due},${duration},${priority},${subjectId},${category},${customCategoryId}) RETURNING id`;
      return NextResponse.json({ id: rows[0].id });
    }
    if (action === "toggleTask") {
      const id = String(body.id || "");
      const rows = await sql`UPDATE nexo_tasks SET status=CASE WHEN status='todo' THEN 'done' ELSE 'todo' END WHERE id=${id} AND user_id=${uid} RETURNING id`;
      return rows.length ? NextResponse.json({ ok: true }) : err("Tarefa não encontrada.", 404);
    }
    if (action === "deleteTask") {
      const id = String(body.id || "");
      await sql`DELETE FROM nexo_events WHERE user_id=${uid} AND task_id=${id}`;
      const rows = await sql`DELETE FROM nexo_tasks WHERE id=${id} AND user_id=${uid} RETURNING id`;
      return rows.length ? NextResponse.json({ ok: true }) : err("Tarefa não encontrada.", 404);
    }
    if (["createEvent", "event", "editEvent", "inspectEvent"].includes(action)) {
      const title = String(body.title || "").trim();
      const day = body.day;
      const allDay = body.allDay === true;
      const start = allDay ? "09:00" : (body.startTime || body.start);
      const end = allDay ? "09:15" : (body.endTime || body.end);
      const category = String(body.category || "personal");
      const customCategoryId = body.customCategoryId ? String(body.customCategoryId) : null;
      if (!isDefaultCategory(category) || (customCategoryId && category !== "other")) return err("Categoria do compromisso inválida.");
      if (customCategoryId) {
        const allowed = await sql`SELECT id FROM nexo_categories WHERE id=${customCategoryId} AND user_id=${uid}`;
        if (!allowed.length) return err("Categoria personalizada não encontrada.",404);
      }
      const repeat = body.repeatWeekly === true || body.repeat === true;
      const repeatYearly = body.repeatYearly === true;
      if (!title || title.length > 180 || !validDay(day) || !validClock(start) || !validClock(end) || minutes(start) >= minutes(end) || (repeat && repeatYearly)) return err("Revise os dados do compromisso.");
      if (action === "inspectEvent") {
        const records = await sql`SELECT id, title, day::text, to_char(start_time,'HH24:MI') AS start_time,
          to_char(end_time,'HH24:MI') AS end_time, COALESCE(category_key,category) AS category, repeat_weekly, repeat_yearly, all_day, task_id
          FROM nexo_events WHERE user_id=${uid}`;
        const candidate: EventRow = {
          id:String(body.id || "__new__"),title,day,start_time:start,end_time:end,
          category,repeat_weekly:repeat,repeat_yearly:repeatYearly,all_day:allDay,task_id:null
        };
        return NextResponse.json({conflicts:potentialEventConflicts(candidate,records as EventRow[])});
      }
      const legacyCategory = ["work","class","training","personal","study"].includes(category) ? category : "personal";
      if (action === "editEvent") {
        const eventId = String(body.id || "");
        const changed = await sql`UPDATE nexo_events SET title=${title}, day=${day}, start_time=${start},end_time=${end}, category=${legacyCategory},category_key=${category},custom_category_id=${customCategoryId},repeat_weekly=${repeat},repeat_yearly=${repeatYearly},all_day=${allDay} WHERE user_id=${uid} AND id=${eventId} RETURNING id`;
        return changed.length ? NextResponse.json({id:changed[0].id}) : err("Compromisso não encontrado.",404);
      }
      const existing = await sql`SELECT id FROM nexo_events WHERE user_id=${uid} AND title=${title} AND day=${day} AND start_time=${start} AND end_time=${end} AND repeat_weekly=${repeat} AND repeat_yearly=${repeatYearly}`;
      if (existing.length) return err("Compromisso já cadastrado.",409);
      const rows = await sql`INSERT INTO nexo_events(user_id,title,day,start_time,end_time,category,category_key,custom_category_id,repeat_weekly,repeat_yearly,all_day)
        VALUES(${uid},${title},${day},${start},${end},${legacyCategory},${category},${customCategoryId},${repeat},${repeatYearly},${allDay}) RETURNING id`;
      return NextResponse.json({ id: rows[0].id });
    }
    if (action === "deleteEvent") {
      const id = String(body.id || "");
      const rows = await sql`DELETE FROM nexo_events WHERE id=${id} AND user_id=${uid} RETURNING id`;
      return rows.length ? NextResponse.json({ ok: true }) : err("Compromisso não encontrado.", 404);
    }
    if (action === "scheduleTask") {
      const taskId = String(body.taskId || "");
      const day = body.day;
      const allDay = body.allDay === true;
      const start = allDay ? "09:00" : (body.startTime || body.start);
      const end = allDay ? "09:15" : (body.endTime || body.end);
      if (!validDay(day) || !validClock(start) || !validClock(end) || minutes(start) >= minutes(end) || minutes(start) < 8*60 || minutes(end) > 21*60) return err("Horário inválido. Agende entre 08h e 21h.");
      const serverToday = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Fortaleza", year:"numeric", month:"2-digit", day:"2-digit"}).format(new Date());
      if (day < serverToday) return err("Não é possível reservar um horário no passado.");
      const tasks = await sql`SELECT title, due_date::text, status, duration_minutes, subject_id, category, custom_category_id FROM nexo_tasks WHERE id=${taskId} AND user_id=${uid}`;
      if (!tasks.length || tasks[0].status === "done") return err("Tarefa indisponível.", 404);
      if (day > tasks[0].due_date) return err("Esse horário é posterior ao prazo da tarefa.");
      const events = await sql`SELECT id, day::text, to_char(start_time,'HH24:MI') AS start_time, to_char(end_time,'HH24:MI') AS end_time, repeat_weekly, repeat_yearly, all_day, task_id FROM nexo_events WHERE user_id=${uid}`;
      const conflict = (events as EventRow[]).some(e => !e.all_day && occurs(e, day) && minutes(start) < minutes(e.end_time) && minutes(end) > minutes(e.start_time));
      if (conflict) return err("Este horário foi ocupado por outro compromisso. Atualize as sugestões.", 409);
      const planned = (events as EventRow[]).filter(e => e.task_id === taskId).reduce((sum,e)=>sum+minutes(e.end_time)-minutes(e.start_time),0);
      if (planned + minutes(end) - minutes(start) > Number(tasks[0].duration_minutes)) return err("O tempo estimado para esta tarefa já foi reservado.",409);
      const taskType = taskCategory(tasks[0].category, tasks[0].subject_id);
      const taskCustomId = tasks[0].custom_category_id || null;
      const label = (taskType === "study" || taskType === "class" ? "Estudar: " : "Fazer: ") + String(tasks[0].title).slice(0, 160);
      const rows = await sql`INSERT INTO nexo_events(user_id,title,day,start_time,end_time,category,category_key,custom_category_id,repeat_weekly,task_id)
        VALUES(${uid},${label},${day},${start},${end},${["work","class","training","personal","study"].includes(taskType) ? taskType : "personal"},${taskType},${taskCustomId},false,${taskId}) RETURNING id`;
      return NextResponse.json({ id: rows[0].id });
    }
    return err("Ação não reconhecida.");
  } catch (e) {
    console.error("nexo/data/post", e);
    return err("Não foi possível salvar. Revise os dados e tente novamente.", 500);
  }
}
