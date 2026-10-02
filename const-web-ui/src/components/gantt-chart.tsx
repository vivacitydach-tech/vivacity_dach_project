'use client';

import { useEffect, useRef } from 'react';
import type { Activity, ActivityDependency } from '@/lib/types';
import type Gantt from 'frappe-gantt';
import type { GanttTask } from 'frappe-gantt';
import '@/styles/frappe-gantt.css';

function toIsoDate(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isBaselineTaskId(taskId: string) {
  return taskId.endsWith('-bl');
}

function mapTasks(
  activities: Activity[],
  dependencies: ActivityDependency[],
): GanttTask[] {
  const depBySuccessor = new Map<string, string[]>();
  for (const d of dependencies) {
    const list = depBySuccessor.get(d.successor_id) ?? [];
    list.push(d.predecessor_id);
    depBySuccessor.set(d.successor_id, list);
  }

  const tasks: GanttTask[] = [];

  for (const a of activities) {
    if (!a.start_date || !a.end_date) continue;

    const deps = depBySuccessor.get(a.id) ?? [];
    tasks.push({
      id: a.id,
      name: `${a.code} — ${a.name}`,
      start: a.start_date.slice(0, 10),
      end: a.end_date.slice(0, 10),
      progress: Number(a.percent_complete) || 0,
      dependencies: deps.length ? deps.join(', ') : '',
      custom_class: a.baseline_start && a.baseline_end ? 'has-baseline' : undefined,
    });

    if (a.baseline_start && a.baseline_end) {
      tasks.push({
        id: `${a.id}-bl`,
        name: `${a.code} — baseline`,
        start: a.baseline_start.slice(0, 10),
        end: a.baseline_end.slice(0, 10),
        progress: 0,
        dependencies: '',
        custom_class: 'baseline',
      });
    }
  }

  return tasks;
}

type Props = {
  activities: Activity[];
  dependencies: ActivityDependency[];
  onDateChange: (
    activityId: string,
    start: string,
    end: string,
  ) => void;
  onProgressChange: (activityId: string, progress: number) => void;
};

export function GanttChart({
  activities,
  dependencies,
  onDateChange,
  onProgressChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ganttRef = useRef<Gantt | null>(null);
  const onDateChangeRef = useRef(onDateChange);
  const onProgressChangeRef = useRef(onProgressChange);

  useEffect(() => {
    onDateChangeRef.current = onDateChange;
    onProgressChangeRef.current = onProgressChange;
  }, [onDateChange, onProgressChange]);

  useEffect(() => {
    let cancelled = false;

    async function mount() {
      if (!containerRef.current) return;
      const tasks = mapTasks(activities, dependencies);
      if (tasks.length === 0) {
        containerRef.current.innerHTML = '';
        ganttRef.current = null;
        return;
      }

      const { default: GanttCtor } = await import('frappe-gantt');
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = '';
      const host = document.createElement('div');
      host.id = `gantt-${Math.random().toString(36).slice(2, 9)}`;
      containerRef.current.appendChild(host);

      ganttRef.current = new GanttCtor(host, tasks, {
        view_mode: 'Week',
        view_mode_select: true,
        scroll_to: 'start',
        language: 'en',
        on_date_change: (task, start, end) => {
          if (isBaselineTaskId(task.id)) return;
          onDateChangeRef.current(
            task.id,
            toIsoDate(start),
            toIsoDate(end),
          );
        },
        on_progress_change: (task, progress) => {
          if (isBaselineTaskId(task.id)) return;
          onProgressChangeRef.current(
            task.id,
            Math.round(Number(progress) || 0),
          );
        },
      });
    }

    void mount();

    return () => {
      cancelled = true;
      ganttRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [activities, dependencies]);

  const datedCount = activities.filter((a) => a.start_date && a.end_date).length;
  if (datedCount === 0) return null;

  return (
    <div className="te-panel overflow-x-auto p-3">
      <div ref={containerRef} className="gantt-host min-h-[220px] w-full" />
    </div>
  );
}
