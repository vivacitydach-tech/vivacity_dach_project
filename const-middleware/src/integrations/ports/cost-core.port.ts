export interface CostCorePort {
  createProject(input: {
    localProjectId: string;
    name: string;
    currency: 'EUR' | 'PKR';
    idempotencyKey: string;
    code?: string | null;
    companyExternalId?: string;
  }): Promise<{ externalId: string }>;

  createBoqItem(
    externalProjectId: string,
    input: {
      code: string;
      description: string;
      quantity: string;
      unitPrice: string;
      currency: string;
      idempotencyKey: string;
    },
  ): Promise<{ externalId: string }>;

  getProjectActualCosts(
    externalProjectId: string,
  ): Promise<{ actualCost: string }>;

  healthCheck(): Promise<boolean>;
}

export const COST_CORE_PORT = Symbol('COST_CORE_PORT');
