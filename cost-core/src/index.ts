import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';
import { optionalBearerAuth } from './auth';

const PORT = Number(process.env.PORT ?? 8069);
const HOST = process.env.HOST ?? '0.0.0.0';
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(optionalBearerAuth);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', engine: 'cost-core' });
});

type CreateResult =
  | { id: string; externalId: string }
  | { error: 400 | 404; message: string };

function createProject(body: {
  name?: string;
  currency?: string;
  code?: string | null;
  local_project_id?: string | null;
}): CreateResult {
  if (!body.name || !body.currency) {
    return { error: 400, message: 'name and currency are required' };
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO projects (id, name, currency, code, local_project_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.currency,
    body.code ?? null,
    body.local_project_id ?? null,
  );
  return { id, externalId: id };
}

app.post('/api/projects', (req: Request, res: Response) => {
  const result = createProject(req.body ?? {});
  if ('error' in result) {
    res.status(result.error).json({ error: result.message });
    return;
  }
  res.status(201).json(result);
});

app.post('/api/v1/projects', (req: Request, res: Response) => {
  const result = createProject(req.body ?? {});
  if ('error' in result) {
    res.status(result.error).json({ error: result.message });
    return;
  }
  res.status(201).json(result);
});

function createBoqItem(
  projectId: string,
  body: {
    code?: string;
    description?: string;
    quantity?: number | string;
    unit_price?: number | string;
    currency?: string;
  },
): CreateResult {
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) {
    return { error: 404, message: 'Project not found' };
  }
  if (
    body.code == null ||
    body.description == null ||
    body.quantity == null ||
    body.unit_price == null ||
    body.currency == null
  ) {
    return {
      error: 400,
      message: 'code, description, quantity, unit_price, currency are required',
    };
  }
  const id = uuidv4();
  db.prepare(
    `INSERT INTO boq_items (id, project_id, code, description, quantity, unit_price, currency)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    projectId,
    body.code,
    body.description,
    Number(body.quantity),
    Number(body.unit_price),
    body.currency,
  );
  return { id, externalId: id };
}

function paramId(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value;
}

app.post('/api/projects/:id/boq-items', (req: Request, res: Response) => {
  const result = createBoqItem(paramId(req.params.id), req.body ?? {});
  if ('error' in result) {
    res.status(result.error).json({ error: result.message });
    return;
  }
  res.status(201).json(result);
});

/** OpenConstructionERP-ish alias: POST /api/v1/boqs with project_id in body */
app.post('/api/v1/boqs', (req: Request, res: Response) => {
  const projectId = (req.body?.project_id ?? req.body?.projectId) as string | undefined;
  if (!projectId) {
    res.status(400).json({ error: 'project_id is required' });
    return;
  }
  const result = createBoqItem(projectId, req.body ?? {});
  if ('error' in result) {
    res.status(result.error).json({ error: result.message });
    return;
  }
  res.status(201).json(result);
});

app.get('/api/projects/:id/actual-costs', (req: Request, res: Response) => {
  const id = paramId(req.params.id);
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(quantity * unit_price), 0) AS total
       FROM boq_items WHERE project_id = ?`,
    )
    .get(id) as { total: number };
  const actual_cost = Number(row.total).toFixed(2);
  res.json({ actual_cost, actualCost: actual_cost });
});

app.listen(PORT, HOST, () => {
  console.log(`[cost-core] listening on http://${HOST}:${PORT}`);
});
