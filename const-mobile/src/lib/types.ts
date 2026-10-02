export type ApiSuccess<T> = {
  data: T
  meta: { request_id: string; timestamp: string }
}

export type ApiErrorBody = {
  error: { code: string; message: string; request_id: string }
}

export type Membership = {
  company_id: string
  company_name: string
  role: string
}

export type AuthUser = {
  id: string
  email: string
  name: string
  memberships: Membership[]
}

export type LoginResult = {
  access_token: string
  refresh_token: string
  expires_in: string
  user: AuthUser
}

export type Project = {
  id: string
  company_id: string
  name: string
  code: string | null
  status: string
  created_at: string
  updated_at: string
}

export type Issue = {
  id: string
  project_id: string
  created_by_id: string
  type: string
  priority: string
  status: string
  title: string
  description: string | null
  location: string | null
  created_at: string
  updated_at: string
}

export type PresignResult = {
  document_id: string
  upload_url: string
  method: string
  storage_path: string
}

export type DocumentComplete = {
  id: string
  project_id: string
  doc_type: string
  file_name: string
  mime_type: string | null
  storage_path: string
  sha256: string | null
  size_bytes: number
  completed_at: string | null
}

export type SiteDiary = {
  id: string
  project_id: string
  author_id: string
  diary_date: string
  weather: string | null
  notes: string
  latitude: string | null
  longitude: string | null
  created_at: string
  updated_at: string
}

export type ChecklistItem = {
  id: string
  label: string
  checked: boolean
  sort_order: number
}

export type ChecklistSignature = {
  id: string
  user_id: string
  signed_at: string
}

export type Checklist = {
  id: string
  project_id: string
  created_by_id: string
  template_key: string
  title: string
  completed_at: string | null
  created_at: string
  updated_at: string
  items: ChecklistItem[]
  signatures: ChecklistSignature[]
}

export type QueueOpType = 'diary' | 'snag' | 'photo' | 'checklist'

export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export type DiaryPayload = {
  projectId: string
  diaryDate: string
  weather?: string
  notes: string
  latitude?: number
  longitude?: number
  createdAt: string
}

export type SnagPayload = {
  projectId: string
  title: string
  description: string
  type: 'defect'
  priority?: 'low' | 'medium' | 'high' | 'critical'
  location?: string
}

export type PhotoPayload = {
  projectId: string
  fileName: string
  mimeType: string
  blobId: string
  note?: string
  latitude?: number
  longitude?: number
}

export type ChecklistCreatePayload = {
  action: 'create'
  projectId: string
  templateKey: string
  title: string
  items: string[]
  localId: string
}

export type ChecklistPatchPayload = {
  action: 'patch'
  projectId: string
  checklistId: string
  items?: { id: string; checked: boolean }[]
  complete?: boolean
}

export type ChecklistSignaturePayload = {
  action: 'signature'
  projectId: string
  checklistId: string
  imageData: string
  complete?: boolean
}

export type ChecklistPayload =
  | ChecklistCreatePayload
  | ChecklistPatchPayload
  | ChecklistSignaturePayload

export type PendingOp = {
  id: string
  idempotencyKey: string
  type: QueueOpType
  status: QueueStatus
  createdAt: string
  lastError?: string
  payload:
    | DiaryPayload
    | SnagPayload
    | PhotoPayload
    | ChecklistPayload
  serverId?: string
}

export type LocalDiary = {
  id: string
  projectId: string
  diaryDate: string
  weather?: string
  notes: string
  latitude?: number
  longitude?: number
  createdAt: string
  syncStatus: QueueStatus
  idempotencyKey: string
  serverId?: string
}

export type LocalIssue = {
  id: string
  projectId: string
  localId: string
  serverId?: string
  title: string
  description: string
  type: string
  priority: string
  /** Server wins for status when a serverId exists */
  status: string
  location?: string
  createdAt: string
  syncStatus: QueueStatus
  idempotencyKey: string
}

export type LocalChecklist = {
  id: string
  projectId: string
  serverId?: string
  templateKey: string
  title: string
  items: ChecklistItem[]
  completedAt?: string | null
  createdAt: string
  syncStatus: QueueStatus
  idempotencyKey?: string
}

export type BlobStore = {
  id: string
  blob: Blob
  mimeType: string
  fileName: string
  createdAt: string
}
