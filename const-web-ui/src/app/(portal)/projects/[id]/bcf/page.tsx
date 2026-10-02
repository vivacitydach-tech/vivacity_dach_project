'use client';

import { useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { ProjectNav } from '@/components/project-nav';
import { PriorityBadge } from '@/components/status-badge';
import { BimViewer } from '@/components/bim-viewer';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui-states';
import { useI18n } from '@/components/i18n-provider';
import { apiGet, apiPatch, apiPost, getErrorMessage } from '@/lib/api';
import {
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  type BcfTopic,
} from '@/lib/types';

const TOPIC_TYPES = [
  'Issue',
  'Fault',
  'Clash',
  'Request',
  'Inquiry',
  'Remark',
] as const;

export default function BcfPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [topicType, setTopicType] =
    useState<(typeof TOPIC_TYPES)[number]>('Issue');
  const [status, setStatus] =
    useState<(typeof ISSUE_STATUSES)[number]>('open');
  const [priority, setPriority] =
    useState<(typeof ISSUE_PRIORITIES)[number]>('medium');
  const [description, setDescription] = useState('');
  const [comments, setComments] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['bcf-topics', id],
    queryFn: () => apiGet<BcfTopic[]>(`/projects/${id}/bcf/topics`),
  });

  const createMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiPost<BcfTopic>(`/projects/${id}/bcf/topics`, body),
    onSuccess: async () => {
      setTitle('');
      setTopicType('Issue');
      setStatus('open');
      setPriority('medium');
      setDescription('');
      setComments('');
      setFormError(null);
      await qc.invalidateQueries({ queryKey: ['bcf-topics', id] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      topicId,
      body,
    }: {
      topicId: string;
      body: Record<string, unknown>;
    }) => apiPatch<BcfTopic>(`/projects/${id}/bcf/topics/${topicId}`, body),
    onSuccess: async () => {
      setRowError(null);
      await qc.invalidateQueries({ queryKey: ['bcf-topics', id] });
    },
    onError: (err) => setRowError(getErrorMessage(err)),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    createMutation.mutate({
      title: title.trim(),
      topic_type: topicType,
      status,
      priority,
      description: description.trim() || null,
      comments: comments.trim() || null,
      link_issue: true,
    });
  }

  const topics = query.data ?? [];

  return (
    <div>
      <PageHeader
        title={t('bcf')}
        subtitle="OpenBIM 3D coordination model & BCF topics linked to defect / clash issues"
      />
      <ProjectNav projectId={id} />

      {/* 3D BIM Viewer Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            🏗️ 3D Architectural & BIM Model Viewer
          </h3>
          <span className="text-xs text-slate-400">
            {topics.length} BCF Issue Pinpoints Loaded
          </span>
        </div>
        <BimViewer
          topics={topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={(tp) => setSelectedTopicId(tp.id)}
        />
      </div>

      <form
        onSubmit={onSubmit}
        className="te-panel mb-6 grid gap-3 p-5 md:grid-cols-4"
      >
        <label className="block md:col-span-2">
          <span className="te-label">{t('title')}</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="te-input"
            placeholder="Topic title"
          />
        </label>
        <label className="block">
          <span className="te-label">{t('topicType')}</span>
          <select
            value={topicType}
            onChange={(e) =>
              setTopicType(e.target.value as (typeof TOPIC_TYPES)[number])
            }
            className="te-input"
          >
            {TOPIC_TYPES.map((tt) => (
              <option key={tt} value={tt}>
                {tt}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="te-label">{t('status')}</span>
          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as (typeof ISSUE_STATUSES)[number])
            }
            className="te-input capitalize"
          >
            {ISSUE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="te-label">{t('priority')}</span>
          <select
            value={priority}
            onChange={(e) =>
              setPriority(e.target.value as (typeof ISSUE_PRIORITIES)[number])
            }
            className="te-input capitalize"
          >
            {ISSUE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-3">
          <span className="te-label">{t('description')}</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="te-input"
            placeholder="Optional description"
          />
        </label>
        <label className="block md:col-span-4">
          <span className="te-label">{t('comments')}</span>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="te-input min-h-[72px]"
            placeholder="Optional comments"
          />
        </label>
        <div className="md:col-span-4">
          {formError ? (
            <p className="mb-2 text-sm text-rose-400">{formError}</p>
          ) : null}
          <button
            type="submit"
            disabled={createMutation.isPending || !title.trim()}
            className="te-btn-primary"
          >
            {createMutation.isPending ? 'Creating…' : t('createTopic')}
          </button>
        </div>
      </form>

      {query.isLoading ? <LoadingState label="Loading BCF topics…" /> : null}
      {query.isError ? (
        <ErrorState
          message={getErrorMessage(query.error)}
          onRetry={() => query.refetch()}
        />
      ) : null}
      {query.isSuccess && topics.length === 0 ? (
        <EmptyState message="No BCF topics yet. Create one to generate a GUID." />
      ) : null}

      {rowError ? (
        <p className="mb-3 text-sm text-rose-400">{rowError}</p>
      ) : null}

      {query.isSuccess && topics.length > 0 ? (
        <div className="te-panel overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t('bcfGuid')}</th>
                <th className="px-4 py-3 font-medium">{t('title')}</th>
                <th className="px-4 py-3 font-medium">{t('topicType')}</th>
                <th className="px-4 py-3 font-medium">{t('priority')}</th>
                <th className="px-4 py-3 font-medium">{t('status')}</th>
                <th className="px-4 py-3 font-medium">{t('comments')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {topics.map((topic) => (
                <tr key={topic.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                    {topic.guid}
                  </td>
                  <td className="px-4 py-3 text-slate-100">{topic.title}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {topic.topic_type}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={topic.priority} />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={topic.status}
                      disabled={patchMutation.isPending}
                      onChange={(e) =>
                        patchMutation.mutate({
                          topicId: topic.id,
                          body: { status: e.target.value },
                        })
                      }
                      className="te-input py-1.5 capitalize"
                      aria-label={t('status')}
                    >
                      {ISSUE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replaceAll('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <CommentsCell
                      key={`${topic.id}-${topic.comments ?? ''}`}
                      initial={topic.comments ?? ''}
                      disabled={patchMutation.isPending}
                      onSave={(value) =>
                        patchMutation.mutate({
                          topicId: topic.id,
                          body: { comments: value || null },
                        })
                      }
                      saveLabel={t('save')}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function CommentsCell({
  initial,
  disabled,
  onSave,
  saveLabel,
}: {
  initial: string;
  disabled: boolean;
  onSave: (value: string) => void;
  saveLabel: string;
}) {
  const [value, setValue] = useState(initial);
  const dirty = value !== initial;

  return (
    <div className="flex min-w-[180px] items-start gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="te-input min-h-[56px] py-1.5 text-xs"
        rows={2}
      />
      <button
        type="button"
        className="te-btn-secondary shrink-0 px-2 py-1 text-xs"
        disabled={disabled || !dirty}
        onClick={() => onSave(value.trim())}
      >
        {saveLabel}
      </button>
    </div>
  );
}
