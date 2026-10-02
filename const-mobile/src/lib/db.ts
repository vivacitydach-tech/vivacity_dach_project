import Dexie, { type EntityTable } from 'dexie'
import type {
  BlobStore,
  LocalChecklist,
  LocalDiary,
  LocalIssue,
  PendingOp,
  Project,
} from './types'

class FieldDB extends Dexie {
  pendingOps!: EntityTable<PendingOp, 'id'>
  diaryEntries!: EntityTable<LocalDiary, 'id'>
  issues!: EntityTable<LocalIssue, 'id'>
  checklists!: EntityTable<LocalChecklist, 'id'>
  blobs!: EntityTable<BlobStore, 'id'>
  projects!: EntityTable<Project, 'id'>

  constructor() {
    super('te_field_db')
    this.version(1).stores({
      pendingOps: 'id, idempotencyKey, type, status, createdAt',
      diaryEntries: 'id, projectId, syncStatus, createdAt, idempotencyKey',
      issues: 'id, projectId, serverId, syncStatus, createdAt, idempotencyKey',
      blobs: 'id, createdAt',
      projects: 'id, name, status',
    })
    this.version(2).stores({
      pendingOps: 'id, idempotencyKey, type, status, createdAt',
      diaryEntries: 'id, projectId, syncStatus, createdAt, idempotencyKey',
      issues: 'id, projectId, serverId, syncStatus, createdAt, idempotencyKey',
      checklists: 'id, projectId, serverId, syncStatus, createdAt',
      blobs: 'id, createdAt',
      projects: 'id, name, status',
    })
  }
}

export const db = new FieldDB()
