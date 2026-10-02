'use client';

import dynamic from 'next/dynamic';
import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import {
  apiGet,
  apiPatch,
  apiPost,
  getErrorMessage,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import {
  DEPENDENCY_TYPES,
  type Activity,
  type ActivityDependency,
} from '@/lib/types';

const GanttChart = dynamic(
  () =>
    import('@/components/gantt-chart').then((m) => m.GanttChart),
  {
    ssr: false,
    loading: () => <LoadingState label="Loading Gantt…" />,
  },
);

function toDateInput(value: string | null | undefined) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function SchedulePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { t } = useI18n();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baselineStart, setBaselineStart] = useState('');
  const [baselineEnd, setBaselineEnd] = useState('');
  const [percentComplete, setPercentComplete] = useState('0');
  const [pv, setPv] = useState('');
  const [ev, setEv] = useState('');
  const [ac, setAc] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [depType, setDepType] =
    useState<(typeof DEPENDENCY_TYPES)[number]>('FS');
  const [lagDays, setLagDays] = useState('0');
  const [depError, setDepError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['activities', id],
    queryFn: () => apiGet<Activity[]>(`/projects/${id}/activities`),
  });

  const depsQuery = useQuery({
    queryKey: ['activity-dependencies', id],
    queryFn: () =>
      apiGet<ActivityDependency[]>(`/projects/${id}/activities/dependencies`),
  });

  const activityLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of query.data ?? []) {
      map.set(a.id, `${a.code} — ${a.name}`);
    }
    return map;
  }, [query.data]);

  const datedActivities = useMemo(
    () => (query.data ?? []).filter((a) => a.start_date && a.end_date),
    [query.data],
  );

  const undatedActivities = useMemo(
    () => (query.data ?? []).filter((a) => !a.start_date || !a.end_date),
    [query.data],
  );

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<Activity>(`/projects/${id}/activities`, body),
    onSuccess: async () => {
      setCode('');
      setName('');
      setStartDate('');
      setEndDate('');
      setBaselineStart('');
      setBaselineEnd('');
      setPercentComplete('0');
      setPv('');
      setEv('');
      setAc('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['activities', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      activityId,
      body,
    }: {
      activityId: string;
      body: Record<string, unknown>;
    }) => apiPatch(`/projects/${id}/activities/${activityId}`, body),
    onSuccess: async () => {
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['activities', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  const patchMutateRef = useRef(patchMutation.mutate);
  patchMutateRef.current = patchMutation.mutate;

  const onGanttDateChange = useCallback(
    (activityId: string, start: string, end: string) => {
      patchMutateRef.current({
        activityId,
        body: { start_date: start, end_date: end },
      });
    },
    [],
  );

  const onGanttProgressChange = useCallback(
    (activityId: string, progress: number) => {
      patchMutateRef.current({
        activityId,
        body: { percent_complete: progress },
      });
    },
    [],
  );

  const depMutation = useMutation({
    mutationFn: (body: {
      predecessor_id: string;
      successor_id: string;
      type: string;
      lag_days: number;
    }) =>
      apiPost<ActivityDependency>(
        `/projects/${id}/activities/dependencies`,
        body,
      ),
    onSuccess: async () => {
      setPredecessorId('');
      setSuccessorId('');
      setDepType('FS');
      setLagDays('0');
      setDepError(null);
      await qc.invalidateQueries({ queryKey: ['activity-dependencies', id] });
    },
    onError: (err) => setDepError(getErrorMessage(err)),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      code: code.trim(),
      name: name.trim(),
    };
    if (startDate) body.start_date = startDate;
    if (endDate) body.end_date = endDate;
    if (baselineStart) body.baseline_start = baselineStart;
    if (baselineEnd) body.baseline_end = baselineEnd;
    if (percentComplete !== '')
      body.percent_complete = Number(percentComplete);
    if (pv.trim() !== '') body.pv = Number(pv);
    if (ev.trim() !== '') body.ev = Number(ev);
    if (ac.trim() !== '') body.ac = Number(ac);
    createMutation.mutate(body);
  }

  function onDepSubmit(e: FormEvent) {
    e.preventDefault();
    if (!predecessorId || !successorId) return;
    depMutation.mutate({
      predecessor_id: predecessorId,
      successor_id: successorId,
      type: depType,
      lag_days: Number(lagDays) || 0,
    });
  }

  return (
    <div>
      <PageHeader
        title={t('schedule')}
        subtitle="Interactive Gantt with baseline fields and dependencies"
      />
      <ProjectNav projectId={id} />

      <form
        onSubmit={onCreate}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-4"
      >
        <label className="block">
          <span className="te-label">{t('code')}</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="te-input font-mono"
            placeholder="A-100"
          />
        </label>
        <label className="block md:col-span-3">
          <span className="te-label">{t('name')}</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="te-input"
            placeholder="Activity name"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('startDate')}</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="te-input"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('endDate')}</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="te-input"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('baselineStart')}</span>
          <input
            type="date"
            value={baselineStart}
            onChange={(e) => setBaselineStart(e.target.value)}
            className="te-input"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('baselineEnd')}</span>
          <input
            type="date"
            value={baselineEnd}
            onChange={(e) => setBaselineEnd(e.target.value)}
            className="te-input"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('percentComplete')}</span>
          <input
            type="number"
            min={0}
            max={100}
            step="any"
            value={percentComplete}
            onChange={(e) => setPercentComplete(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block">
          <span className="te-label">PV</span>
          <input
            type="number"
            step="any"
            value={pv}
            onChange={(e) => setPv(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block">
          <span className="te-label">EV</span>
          <input
            type="number"
            step="any"
            value={ev}
            onChange={(e) => setEv(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <label className="block">
          <span className="te-label">AC</span>
          <input
            type="number"
            step="any"
            value={ac}
            onChange={(e) => setAc(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <div className="md:col-span-2">
          {formError ? (
            <p className="mb-2 text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending || !code.trim() || !name.trim()}
            className="te-btn-primary"
          >
            {createMutation.isPending ? 'Creating…' : t('createActivity')}
          </button>
        </div>
      </form>

      <form
        onSubmit={onDepSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-5"
      >
        <p className="md:col-span-5 text-sm font-semibold text-slate-300">
          Dependencies
        </p>
        <label className="block md:col-span-2">
          <span className="te-label">Predecessor</span>
          <select
            required
            value={predecessorId}
            onChange={(e) => setPredecessorId(e.target.value)}
            className="te-input"
          >
            <option value="">Select…</option>
            {(query.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="te-label">Successor</span>
          <select
            required
            value={successorId}
            onChange={(e) => setSuccessorId(e.target.value)}
            className="te-input"
          >
            <option value="">Select…</option>
            {(query.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.code} — {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="te-label">Type</span>
          <select
            value={depType}
            onChange={(e) =>
              setDepType(e.target.value as (typeof DEPENDENCY_TYPES)[number])
            }
            className="te-input font-mono"
          >
            {DEPENDENCY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="te-label">Lag (days)</span>
          <input
            type="number"
            step={1}
            value={lagDays}
            onChange={(e) => setLagDays(e.target.value)}
            className="te-input font-mono"
          />
        </label>
        <div className="flex items-end md:col-span-4">
          {depError ? (
            <p className="mb-2 w-full text-sm text-rose-400">{depError}</p>
          ) : null}
          <button
            type="submit"
            disabled={
              depMutation.isPending || !predecessorId || !successorId
            }
            className="te-btn-primary"
          >
            {depMutation.isPending ? 'Saving…' : 'Add dependency'}
          </button>
        </div>
      </form>

      {depsQuery.isSuccess && depsQuery.data.length > 0 ? (
        <div className="te-panel mb-6 overflow-hidden">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Predecessor</th>
                <th className="px-4 py-3 font-medium">Successor</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Lag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {depsQuery.data.map((d) => (
                <tr key={d.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-slate-200">
                    {activityLabel.get(d.predecessor_id) ?? d.predecessor_id}
                  </td>
                  <td className="px-4 py-3 text-slate-200">
                    {activityLabel.get(d.successor_id) ?? d.successor_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                    {d.type}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-slate-300">
                    {d.lag_days}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {query.isLoading ? <LoadingState label="Loading schedule…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && (query.data?.length ?? 0) === 0 ? (
        <EmptyState message="No activities for this project." />
      ) : null}

      {rowError ? (
        <p className="mb-3 text-sm text-rose-400">{rowError}</p>
      ) : null}

      {query.isSuccess && datedActivities.length > 0 ? (
        <div className="mb-6">
          <GanttChart
            activities={query.data ?? []}
            dependencies={depsQuery.data ?? []}
            onDateChange={onGanttDateChange}
            onProgressChange={onGanttProgressChange}
          />
        </div>
      ) : null}

      {query.isSuccess && undatedActivities.length > 0 ? (
        <div className="te-panel mb-6 overflow-x-auto p-4">
          <p className="mb-3 text-sm text-slate-400">
            Activities without start/end dates — set dates to show them on the
            Gantt.
          </p>
          <div className="space-y-4">
            {undatedActivities.map((a) => (
              <UndatedActivityRow
                key={a.id}
                activity={a}
                busy={patchMutation.isPending}
                onSave={(start, end) =>
                  patchMutation.mutate({
                    activityId: a.id,
                    body: { start_date: start, end_date: end },
                  })
                }
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UndatedActivityRow({
  activity,
  busy,
  onSave,
}: {
  activity: Activity;
  busy: boolean;
  onSave: (start: string, end: string) => void;
}) {
  const [start, setStart] = useState(toDateInput(activity.start_date));
  const [end, setEnd] = useState(toDateInput(activity.end_date));

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-slate-800 pb-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-100">
          <span className="font-mono text-xs text-emerald-400">
            {activity.code}
          </span>{' '}
          {activity.name}
        </p>
        <p className="font-mono text-xs text-slate-500">
          Baseline {formatDate(toDateInput(activity.baseline_start) || null)} →{' '}
          {formatDate(toDateInput(activity.baseline_end) || null)}
        </p>
      </div>
      <label className="block">
        <span className="te-label">Start</span>
        <input
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="te-input"
        />
      </label>
      <label className="block">
        <span className="te-label">End</span>
        <input
          type="date"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          className="te-input"
        />
      </label>
      <button
        type="button"
        disabled={busy || !start || !end}
        className="te-btn-primary"
        onClick={() => onSave(start, end)}
      >
        Save dates
      </button>
    </div>
  );
}
