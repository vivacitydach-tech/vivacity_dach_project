export interface PmCorePort {
  createProject(input: {
    localProjectId: string;
    name: string;
    idempotencyKey: string;
    code?: string | null;
    companyExternalId?: string;
  }): Promise<{ externalId: string }>;

  createWorkPackage(input: {
    localIssueId: string;
    externalProjectId: string;
    title: string;
    type: string;
    priority: string;
    description?: string | null;
    bcfTopic?: Record<string, unknown>;
    idempotencyKey: string;
  }): Promise<{ externalId: string; bcfGuid?: string }>;

  /** @deprecated Prefer createWorkPackage — kept for sync worker compatibility */
  syncIssue(input: {
    projectExternalId: string;
    title: string;
    description?: string | null;
    type: string;
    priority: string;
  }): Promise<{ externalIssueId: string }>;

  getProjectProgress(externalProjectId: string): Promise<
    Array<{
      externalId: string;
      percentComplete: number;
      actualStart?: string;
      actualEnd?: string;
    }>
  >;

  healthCheck(): Promise<boolean>;
}

export const PM_CORE_PORT = Symbol('PM_CORE_PORT');
