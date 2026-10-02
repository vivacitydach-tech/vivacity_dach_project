import { v4 as uuid } from 'uuid'
import { apiRequest, sha256Hex } from './api'
import { db } from './db'
import type {
  Checklist,
  ChecklistCreatePayload,
  ChecklistPatchPayload,
  ChecklistPayload,
  ChecklistSignaturePayload,
  DiaryPayload,
  DocumentComplete,
  Issue,
  LocalChecklist,
  LocalDiary,
  LocalIssue,
  PendingOp,
  PhotoPayload,
  PresignResult,
  Project,
  SiteDiary,
  SnagPayload,
} from './types'

let syncing = false

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

export async function cacheProjects(projects: Project[]): Promise<void> {
  await db.projects.clear()
  await db.projects.bulkPut(projects)
}

export async function getCachedProjects(): Promise<Project[]> {
  return db.projects.orderBy('name').toArray()
}

export async function enqueueDiary(input: {
  projectId: string
  diaryDate: string
  weather?: string
  notes: string
  latitude?: number
  longitude?: number
}): Promise<LocalDiary> {
  const idempotencyKey = uuid()
  const id = uuid()
  const createdAt = new Date().toISOString()
  const entry: LocalDiary = {
    id,
    projectId: input.projectId,
    diaryDate: input.diaryDate,
    weather: input.weather,
    notes: input.notes,
    latitude: input.latitude,
    longitude: input.longitude,
    createdAt,
    syncStatus: 'pending',
    idempotencyKey,
  }
  const op: PendingOp = {
    id: uuid(),
    idempotencyKey,
    type: 'diary',
    status: 'pending',
    createdAt,
    payload: {
      projectId: input.projectId,
      diaryDate: input.diaryDate,
      weather: input.weather,
      notes: input.notes,
      latitude: input.latitude,
      longitude: input.longitude,
      createdAt,
    } satisfies DiaryPayload,
  }
  await db.transaction('rw', db.diaryEntries, db.pendingOps, async () => {
    await db.diaryEntries.put(entry)
    await db.pendingOps.put(op)
  })
  void flushQueue()
  return entry
}

export async function enqueueSnag(input: {
  projectId: string
  title: string
  description: string
  location?: string
  priority?: SnagPayload['priority']
}): Promise<LocalIssue> {
  const idempotencyKey = uuid()
  const localId = uuid()
  const createdAt = new Date().toISOString()
  const issue: LocalIssue = {
    id: localId,
    localId,
    projectId: input.projectId,
    title: input.title,
    description: input.description,
    type: 'defect',
    priority: input.priority ?? 'medium',
    status: 'pending_sync',
    location: input.location,
    createdAt,
    syncStatus: 'pending',
    idempotencyKey,
  }
  const op: PendingOp = {
    id: uuid(),
    idempotencyKey,
    type: 'snag',
    status: 'pending',
    createdAt,
    payload: {
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      type: 'defect',
      priority: input.priority ?? 'medium',
      location: input.location,
    } satisfies SnagPayload,
  }
  await db.transaction('rw', db.issues, db.pendingOps, async () => {
    await db.issues.put(issue)
    await db.pendingOps.put(op)
  })
  void flushQueue()
  return issue
}

export async function enqueuePhoto(input: {
  projectId: string
  file: File | Blob
  fileName?: string
  note?: string
  latitude?: number
  longitude?: number
}): Promise<PendingOp> {
  const idempotencyKey = uuid()
  const blobId = uuid()
  const createdAt = new Date().toISOString()
  const mimeType = input.file.type || 'image/jpeg'
  const fileName =
    input.fileName || `photo-${createdAt.replace(/[:.]/g, '-')}.jpg`

  await db.blobs.put({
    id: blobId,
    blob: input.file,
    mimeType,
    fileName,
    createdAt,
  })

  const op: PendingOp = {
    id: uuid(),
    idempotencyKey,
    type: 'photo',
    status: 'pending',
    createdAt,
    payload: {
      projectId: input.projectId,
      fileName,
      mimeType,
      blobId,
      note: input.note,
      latitude: input.latitude,
      longitude: input.longitude,
    } satisfies PhotoPayload,
  }
  await db.pendingOps.put(op)
  void flushQueue()
  return op
}

export async function enqueueChecklistCreate(input: {
  projectId: string
  templateKey: string
  title: string
  items: string[]
}): Promise<LocalChecklist> {
  const idempotencyKey = uuid()
  const localId = uuid()
  const createdAt = new Date().toISOString()
  const checklist: LocalChecklist = {
    id: localId,
    projectId: input.projectId,
    templateKey: input.templateKey,
    title: input.title,
    items: input.items.map((label, index) => ({
      id: uuid(),
      label,
      checked: false,
      sort_order: index,
    })),
    completedAt: null,
    createdAt,
    syncStatus: 'pending',
    idempotencyKey,
  }
  const op: PendingOp = {
    id: uuid(),
    idempotencyKey,
    type: 'checklist',
    status: 'pending',
    createdAt,
    payload: {
      action: 'create',
      projectId: input.projectId,
      templateKey: input.templateKey,
      title: input.title,
      items: input.items,
      localId,
    } satisfies ChecklistCreatePayload,
  }
  await db.transaction('rw', db.checklists, db.pendingOps, async () => {
    await db.checklists.put(checklist)
    await db.pendingOps.put(op)
  })
  void flushQueue()
  return checklist
}

export async function enqueueChecklistPatch(input: {
  projectId: string
  checklistId: string
  items?: { id: string; checked: boolean }[]
  complete?: boolean
}): Promise<PendingOp> {
  const idempotencyKey = uuid()
  const createdAt = new Date().toISOString()
  const op: PendingOp = {
    id: uuid(),
    idempotencyKey,
    type: 'checklist',
    status: 'pending',
    createdAt,
    payload: {
      action: 'patch',
      projectId: input.projectId,
      checklistId: input.checklistId,
      items: input.items,
      complete: input.complete,
    } satisfies ChecklistPatchPayload,
  }

  const local =
    (await db.checklists.get(input.checklistId)) ??
    (await db.checklists.where('serverId').equals(input.checklistId).first())

  if (local) {
    const nextItems = input.items?.length
      ? local.items.map((item) => {
          const patch = input.items!.find((p) => p.id === item.id)
          return patch ? { ...item, checked: patch.checked } : item
        })
      : local.items
    await db.checklists.update(local.id, {
      items: nextItems,
      syncStatus: 'pending',
      ...(input.complete === true
        ? { completedAt: createdAt }
        : input.complete === false
          ? { completedAt: null }
          : {}),
    })
  }

  await db.pendingOps.put(op)
  void flushQueue()
  return op
}

export async function enqueueChecklistSignature(input: {
  projectId: string
  checklistId: string
  imageData: string
  complete?: boolean
}): Promise<PendingOp> {
  const idempotencyKey = uuid()
  const createdAt = new Date().toISOString()
  const op: PendingOp = {
    id: uuid(),
    idempotencyKey,
    type: 'checklist',
    status: 'pending',
    createdAt,
    payload: {
      action: 'signature',
      projectId: input.projectId,
      checklistId: input.checklistId,
      imageData: input.imageData,
      complete: input.complete ?? true,
    } satisfies ChecklistSignaturePayload,
  }
  const local =
    (await db.checklists.get(input.checklistId)) ??
    (await db.checklists.where('serverId').equals(input.checklistId).first())
  if (local) {
    await db.checklists.update(local.id, {
      syncStatus: 'pending',
      ...(input.complete !== false ? { completedAt: createdAt } : {}),
    })
  }
  await db.pendingOps.put(op)
  void flushQueue()
  return op
}

async function uploadDocument(opts: {
  projectId: string
  docType: 'photo' | 'report' | 'other'
  fileName: string
  mimeType: string
  blob: Blob
  idempotencyKey: string
  latitude?: number
  longitude?: number
}): Promise<DocumentComplete> {
  const presign = await apiRequest<PresignResult>(
    `/projects/${opts.projectId}/documents/presign`,
    {
      method: 'POST',
      idempotencyKey: `${opts.idempotencyKey}:presign`,
      body: {
        doc_type: opts.docType,
        file_name: opts.fileName,
        mime_type: opts.mimeType,
        ...(opts.latitude !== undefined ? { latitude: opts.latitude } : {}),
        ...(opts.longitude !== undefined ? { longitude: opts.longitude } : {}),
      },
    },
  )

  if (/^https?:\/\//i.test(presign.upload_url)) {
    await fetch(presign.upload_url, {
      method: presign.method || 'PUT',
      body: opts.blob,
      headers: { 'Content-Type': opts.mimeType },
    })
  }

  const sha256 = await sha256Hex(opts.blob)
  const completeBody: Record<string, unknown> = {
    sha256,
    size_bytes: opts.blob.size,
  }
  if (opts.latitude !== undefined) completeBody.latitude = opts.latitude
  if (opts.longitude !== undefined) completeBody.longitude = opts.longitude

  return apiRequest<DocumentComplete>(
    `/projects/${opts.projectId}/documents/${presign.document_id}/complete`,
    {
      method: 'POST',
      idempotencyKey: `${opts.idempotencyKey}:complete`,
      body: completeBody,
    },
  )
}

function resolveChecklistServerId(localOrServerId: string): Promise<string> {
  return db.checklists.get(localOrServerId).then((row) => row?.serverId ?? localOrServerId)
}

async function processChecklistOp(op: PendingOp): Promise<void> {
  const payload = op.payload as ChecklistPayload

  if (payload.action === 'create') {
    const created = await apiRequest<Checklist>(
      `/projects/${payload.projectId}/checklists`,
      {
        method: 'POST',
        idempotencyKey: op.idempotencyKey,
        body: {
          template_key: payload.templateKey,
          title: payload.title,
          items: payload.items,
        },
      },
    )
    const local = await db.checklists.get(payload.localId)
    const checkedByLabel = new Map(
      (local?.items ?? [])
        .filter((i) => i.checked)
        .map((i) => [i.label, true] as const),
    )
    let items = created.items
    const toPatch = items
      .filter((i) => checkedByLabel.get(i.label))
      .map((i) => ({ id: i.id, checked: true }))
    if (toPatch.length) {
      const updated = await apiRequest<Checklist>(
        `/projects/${payload.projectId}/checklists/${created.id}`,
        {
          method: 'PATCH',
          idempotencyKey: `${op.idempotencyKey}:checks`,
          body: { items: toPatch },
        },
      )
      items = updated.items
    }
    await db.checklists.update(payload.localId, {
      serverId: created.id,
      items,
      syncStatus: 'synced',
      completedAt: created.completed_at,
    })
    await db.pendingOps.update(op.id, {
      status: 'synced',
      serverId: created.id,
    })
    return
  }

  if (payload.action === 'patch') {
    const checklistId = await resolveChecklistServerId(payload.checklistId)
    const updated = await apiRequest<Checklist>(
      `/projects/${payload.projectId}/checklists/${checklistId}`,
      {
        method: 'PATCH',
        idempotencyKey: op.idempotencyKey,
        body: {
          ...(payload.items?.length
            ? {
                items: payload.items.map((i) => ({
                  id: i.id,
                  checked: i.checked,
                })),
              }
            : {}),
          ...(payload.complete !== undefined ? { complete: payload.complete } : {}),
        },
      },
    )
    const local = await db.checklists
      .where('serverId')
      .equals(checklistId)
      .first()
    const localById = await db.checklists.get(payload.checklistId)
    const targetId = local?.id ?? localById?.id ?? checklistId
    await db.checklists.update(targetId, {
      serverId: updated.id,
      items: updated.items,
      completedAt: updated.completed_at,
      syncStatus: 'synced',
    })
    await db.pendingOps.update(op.id, {
      status: 'synced',
      serverId: updated.id,
    })
    return
  }

  if (payload.action === 'signature') {
    const checklistId = await resolveChecklistServerId(payload.checklistId)
    await apiRequest(`/projects/${payload.projectId}/checklists/${checklistId}/signature`, {
      method: 'POST',
      idempotencyKey: op.idempotencyKey,
      body: { image_data: payload.imageData },
    })
    if (payload.complete !== false) {
      const updated = await apiRequest<Checklist>(
        `/projects/${payload.projectId}/checklists/${checklistId}`,
        {
          method: 'PATCH',
          idempotencyKey: `${op.idempotencyKey}:complete`,
          body: { complete: true },
        },
      )
      const local = await db.checklists
        .where('serverId')
        .equals(checklistId)
        .first()
      const localById = await db.checklists.get(payload.checklistId)
      const targetId = local?.id ?? localById?.id ?? checklistId
      await db.checklists.update(targetId, {
        completedAt: updated.completed_at,
        syncStatus: 'synced',
      })
    }
    await db.pendingOps.update(op.id, {
      status: 'synced',
      serverId: checklistId,
    })
  }
}

async function processOp(op: PendingOp): Promise<void> {
  await db.pendingOps.update(op.id, { status: 'syncing', lastError: undefined })

  try {
    if (op.type === 'diary') {
      const payload = op.payload as DiaryPayload
      const body: Record<string, unknown> = {
        diary_date: payload.diaryDate,
        notes: payload.notes,
      }
      if (payload.weather) body.weather = payload.weather
      if (payload.latitude !== undefined) body.latitude = payload.latitude
      if (payload.longitude !== undefined) body.longitude = payload.longitude

      const created = await apiRequest<SiteDiary>(
        `/projects/${payload.projectId}/diaries`,
        {
          method: 'POST',
          idempotencyKey: op.idempotencyKey,
          body,
        },
      )

      await db.diaryEntries
        .where('idempotencyKey')
        .equals(op.idempotencyKey)
        .modify({
          syncStatus: 'synced',
          serverId: created.id,
        })
      await db.pendingOps.update(op.id, {
        status: 'synced',
        serverId: created.id,
      })
      return
    }

    if (op.type === 'snag') {
      const payload = op.payload as SnagPayload
      const created = await apiRequest<Issue>(
        `/projects/${payload.projectId}/issues`,
        {
          method: 'POST',
          idempotencyKey: op.idempotencyKey,
          body: {
            type: 'defect',
            title: payload.title,
            description: payload.description,
            priority: payload.priority ?? 'medium',
            location: payload.location,
          },
        },
      )

      await db.issues
        .where('idempotencyKey')
        .equals(op.idempotencyKey)
        .modify({
          syncStatus: 'synced',
          serverId: created.id,
          status: created.status,
        })
      await db.pendingOps.update(op.id, {
        status: 'synced',
        serverId: created.id,
      })
      return
    }

    if (op.type === 'photo') {
      const payload = op.payload as PhotoPayload
      const stored = await db.blobs.get(payload.blobId)
      if (!stored) throw new Error('Photo blob missing from IndexedDB')

      const completed = await uploadDocument({
        projectId: payload.projectId,
        docType: 'photo',
        fileName: payload.fileName,
        mimeType: payload.mimeType,
        blob: stored.blob,
        idempotencyKey: op.idempotencyKey,
        latitude: payload.latitude,
        longitude: payload.longitude,
      })

      await db.blobs.delete(payload.blobId)
      await db.pendingOps.update(op.id, {
        status: 'synced',
        serverId: completed.id,
      })
      return
    }

    if (op.type === 'checklist') {
      await processChecklistOp(op)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await db.pendingOps.update(op.id, { status: 'failed', lastError: message })
    if (op.type === 'diary') {
      await db.diaryEntries
        .where('idempotencyKey')
        .equals(op.idempotencyKey)
        .modify({ syncStatus: 'failed' })
    }
    if (op.type === 'snag') {
      await db.issues
        .where('idempotencyKey')
        .equals(op.idempotencyKey)
        .modify({ syncStatus: 'failed' })
    }
    if (op.type === 'checklist') {
      const payload = op.payload as ChecklistPayload
      if (payload.action === 'create') {
        await db.checklists.update(payload.localId, { syncStatus: 'failed' })
      } else {
        await db.checklists.update(payload.checklistId, { syncStatus: 'failed' })
      }
    }
    throw err
  }
}

/** Replay pending ops with the same Idempotency-Key on each attempt. */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (!isOnline() || syncing) return { synced: 0, failed: 0 }
  syncing = true
  let synced = 0
  let failed = 0
  try {
    const pending = await db.pendingOps
      .where('status')
      .anyOf(['pending', 'failed'])
      .sortBy('createdAt')

    for (const op of pending) {
      try {
        await processOp(op)
        synced += 1
      } catch {
        failed += 1
      }
    }
  } finally {
    syncing = false
  }
  return { synced, failed }
}

/**
 * Pull server issues and apply conflict rule: server wins for status.
 * Local-only append rows (no serverId) are kept untouched.
 */
export async function reconcileIssues(projectId: string): Promise<Issue[]> {
  const remote = await apiRequest<Issue[]>(`/projects/${projectId}/issues`)
  await db.transaction('rw', db.issues, async () => {
    for (const issue of remote) {
      const existing = await db.issues
        .where('serverId')
        .equals(issue.id)
        .first()
      if (existing) {
        await db.issues.update(existing.id, {
          status: issue.status,
          title: issue.title,
          description: issue.description ?? '',
          priority: issue.priority,
          syncStatus: 'synced',
        })
      } else {
        const localDup = await db.issues
          .filter(
            (row) =>
              row.projectId === projectId &&
              row.title === issue.title &&
              row.syncStatus === 'synced' &&
              !row.serverId,
          )
          .first()
        if (localDup) {
          await db.issues.update(localDup.id, {
            serverId: issue.id,
            status: issue.status,
          })
        } else {
          await db.issues.put({
            id: issue.id,
            localId: issue.id,
            serverId: issue.id,
            projectId,
            title: issue.title,
            description: issue.description ?? '',
            type: issue.type,
            priority: issue.priority,
            status: issue.status,
            location: issue.location ?? undefined,
            createdAt: issue.created_at,
            syncStatus: 'synced',
            idempotencyKey: `server:${issue.id}`,
          })
        }
      }
    }
  })
  return remote
}

export async function reconcileChecklists(projectId: string): Promise<Checklist[]> {
  const remote = await apiRequest<Checklist[]>(`/projects/${projectId}/checklists`)
  await db.transaction('rw', db.checklists, async () => {
    for (const row of remote) {
      const existing = await db.checklists
        .where('serverId')
        .equals(row.id)
        .first()
      const byId = await db.checklists.get(row.id)
      const target = existing ?? byId
      const local: LocalChecklist = {
        id: target?.id ?? row.id,
        projectId,
        serverId: row.id,
        templateKey: row.template_key,
        title: row.title,
        items: row.items,
        completedAt: row.completed_at,
        createdAt: row.created_at,
        syncStatus: 'synced',
      }
      await db.checklists.put(local)
    }
  })
  return remote
}

export async function pendingCount(): Promise<number> {
  return db.pendingOps.where('status').anyOf(['pending', 'failed', 'syncing']).count()
}

export function startSyncListeners(onChange?: () => void): () => void {
  const run = () => {
    void flushQueue().finally(() => onChange?.())
  }
  window.addEventListener('online', run)
  const timer = window.setInterval(run, 15000)
  run()
  return () => {
    window.removeEventListener('online', run)
    window.clearInterval(timer)
  }
}
