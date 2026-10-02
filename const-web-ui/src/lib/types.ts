export type ApiSuccess<T> = {
  data: T;
  meta: { request_id: string; timestamp: string };
};

export type ApiErrorBody = {
  error: { code: string; message: string; request_id: string };
};

export type Membership = {
  company_id: string;
  company_name: string;
  role: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  memberships: Membership[];
};

export type LoginResult = {
  access_token: string;
  refresh_token: string;
  expires_in: string;
  user: AuthUser;
};

export type Company = {
  id: string;
  name: string;
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type UnitRate = {
  id: string;
  company_id: string;
  code: string;
  description: string;
  unit: string;
  unit_price: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type BoqNode = {
  id: string;
  parent_id: string | null;
  code: string;
  name: string;
  unit: string | null;
  quantity: string;
  unit_price: string | null;
  sort_order: number;
  children: BoqNode[];
};

export type Activity = {
  id: string;
  project_id: string;
  code: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  percent_complete: string;
  pv: string;
  ev: string;
  ac: string;
  created_at: string;
  updated_at: string;
};

export type ActivityDependency = {
  id: string;
  project_id: string;
  predecessor_id: string;
  successor_id: string;
  type: string;
  lag_days: number;
  created_at: string;
};

export type ChangeOrder = {
  id: string;
  project_id: string;
  issue_id: string | null;
  boq_item_id: string | null;
  title: string;
  description: string | null;
  status: string;
  delta_cost: string;
  delta_days: string;
  created_at: string;
  updated_at: string;
};

export type BcfTopic = {
  id: string;
  guid: string;
  title: string;
  topic_type: string;
  status: string;
  priority: string;
  description: string | null;
  comments: string | null;
  issue_id: string | null;
};

export type Issue = {
  id: string;
  project_id: string;
  created_by_id: string;
  type: string;
  priority: string;
  status: string;
  title: string;
  description: string | null;
  location: string | null;
  bcf_guid: string | null;
  cost_impact: string | null;
  time_impact_days: string | null;
  created_at: string;
  updated_at: string;
};

export type EvmSnapshot = {
  id: string;
  project_id: string;
  as_of_date: string;
  pv: string;
  ev: string;
  ac: string;
  bac: string;
  spi: string | null;
  cpi: string | null;
  created_at: string;
};

export type EvmAlert = {
  snapshot: EvmSnapshot | null;
  alerts: {
    spi_alert: boolean;
    cpi_alert: boolean;
  };
  spi_alert?: boolean;
  cpi_alert?: boolean;
};

export type PresignResult = {
  document_id: string;
  upload_url: string;
  method: string;
  storage_path: string;
};

export type DocumentComplete = {
  id: string;
  project_id: string;
  doc_type: string;
  file_name: string;
  mime_type: string | null;
  storage_path: string | null;
  sha256: string | null;
  size_bytes: number;
  latitude?: string | null;
  longitude?: string | null;
  completed_at: string | null;
};

/** Document library row (alias with optional GPS fields). */
export type Document = DocumentComplete;

export type SiteDiary = {
  id: string;
  project_id: string;
  author_id: string;
  diary_date: string;
  weather: string | null;
  notes: string;
  latitude: string | null;
  longitude: string | null;
  created_at: string;
  updated_at: string;
};

export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
  sort_order: number;
};

export type ChecklistSignature = {
  id: string;
  user_id: string;
  signed_at: string;
};

export type Checklist = {
  id: string;
  project_id: string;
  created_by_id: string;
  template_key: string;
  title: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  items: ChecklistItem[];
  signatures: ChecklistSignature[];
};

export type Member = {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  project_id?: string;
};

export type CurrencyCode = 'EUR' | 'PKR';

export const ISSUE_TYPES = [
  'defect',
  'rfi',
  'observation',
  'safety',
  'change_request',
  'snag',
  'design',
  'inspection',
] as const;

export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export const ISSUE_STATUSES = [
  'open',
  'in_progress',
  'pending_sync',
  'resolved',
  'closed',
] as const;

export const MEMBER_ROLES = [
  'admin',
  'project_manager',
  'site_manager',
  'subcontractor',
  'client',
] as const;

export const DOC_TYPES = [
  'drawing',
  'photo',
  'report',
  'contract',
  'other',
  'protocol',
  'abnahme',
  'site_photo',
  'boq_export',
] as const;

export const DEPENDENCY_TYPES = ['FS', 'SS', 'FF', 'SF'] as const;

export const CHANGE_ORDER_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'implemented',
] as const;
