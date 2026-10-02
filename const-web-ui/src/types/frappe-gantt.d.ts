declare module 'frappe-gantt' {
  export type GanttTask = {
    id: string;
    name: string;
    start: string;
    end: string;
    progress?: number;
    dependencies?: string | string[];
    custom_class?: string;
    [key: string]: unknown;
  };

  export type GanttOptions = {
    view_mode?: string;
    view_mode_select?: boolean;
    readonly?: boolean;
    readonly_dates?: boolean;
    readonly_progress?: boolean;
    scroll_to?: string | null;
    language?: string;
    popup_on?: 'click' | 'hover';
    on_date_change?: (task: GanttTask, start: Date, end: Date) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
    on_click?: (task: GanttTask) => void;
    [key: string]: unknown;
  };

  export default class Gantt {
    constructor(
      element: string | HTMLElement | SVGElement,
      tasks: GanttTask[],
      options?: GanttOptions,
    );
    refresh(tasks: GanttTask[]): void;
    update_task(taskId: string, details: Partial<GanttTask>): void;
    change_view_mode(mode?: string | object, maintainPos?: boolean): void;
  }
}

declare module 'frappe-gantt/dist/frappe-gantt.css';
