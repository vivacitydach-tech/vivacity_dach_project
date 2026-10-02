import express, { Request, Response } from 'express';
import cors from 'cors';
import { db } from './db';
import { optionalBearerAuth } from './auth';
import { randomUUID } from 'crypto';

const PORT = Number(process.env.PORT ?? 8080);
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(optionalBearerAuth);

const rootPayload = {
  _type: 'Root',
  _links: {
    self: { href: '/api/v3' },
    projects: { href: '/api/v3/projects' },
    workPackages: { href: '/api/v3/work_packages' },
  },
};

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', engine: 'pm-core', ...rootPayload });
});

app.get('/api/v3', (_req: Request, res: Response) => {
  res.json(rootPayload);
});

app.post('/api/v3/projects', (req: Request, res: Response) => {
  const { name, identifier } = req.body ?? {};
  if (!name || !identifier) {
    res.status(400).json({ error: 'name and identifier are required' });
    return;
  }

  try {
    const info = db
      .prepare('INSERT INTO projects (name, identifier) VALUES (?, ?)')
      .run(name, identifier);
    const id = Number(info.lastInsertRowid);
    res.status(201).json({
      id,
      name,
      identifier,
      _type: 'Project',
      _links: {
        self: { href: `/api/v3/projects/${id}` },
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNIQUE')) {
      res.status(409).json({ error: 'identifier already exists' });
      return;
    }
    throw e;
  }
});

app.post('/api/v3/work_packages', (req: Request, res: Response) => {
  const body = req.body ?? {};
  const subject = body.subject as string | undefined;
  const descriptionRaw =
    typeof body.description === 'object' && body.description !== null
      ? String((body.description as { raw?: string }).raw ?? '')
      : String(body.description ?? '');

  const projectHref =
    body._links?.project?.href ??
    body._links?.project ??
    body.project_href ??
    '';
  const hrefStr = String(projectHref);
  const projectMatch = /\/api\/v3\/projects\/(\d+)/.exec(hrefStr);
  if (!subject || !projectMatch) {
    res.status(400).json({
      error:
        'subject and _links.project.href (/api/v3/projects/:id) are required',
    });
    return;
  }

  const projectId = Number(projectMatch[1]);
  const project = db
    .prepare('SELECT id FROM projects WHERE id = ?')
    .get(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const typeName =
    (body._links?.type?.title as string | undefined) ??
    (body.type as string | undefined) ??
    'Activity';
  const priorityName =
    (body._links?.priority?.title as string | undefined) ??
    (body.priority as string | undefined) ??
    'Normal';

  let bcfGuid: string | undefined;
  if (body.customFieldBcf != null) {
    bcfGuid =
      (body.customFieldBcf as { guid?: string }).guid ?? randomUUID();
  }

  const info = db
    .prepare(
      `INSERT INTO work_packages
        (project_id, subject, description, type_name, priority_name, bcf_guid)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(projectId, subject, descriptionRaw, typeName, priorityName, bcfGuid ?? null);

  const id = Number(info.lastInsertRowid);
  res.status(201).json({
    id,
    subject,
    description: { format: 'plain', raw: descriptionRaw },
    percentageDone: 0,
    _type: 'WorkPackage',
    _links: {
      self: { href: `/api/v3/work_packages/${id}` },
      project: { href: `/api/v3/projects/${projectId}` },
      type: { title: typeName },
      priority: { title: priorityName },
    },
    ...(bcfGuid
      ? { _embedded: { customField: { bcfGuid } } }
      : {}),
  });
});

app.get(
  '/api/v3/projects/:id/work_packages',
  (req: Request, res: Response) => {
    const projectId = Number(req.params.id);
    const project = db
      .prepare('SELECT id FROM projects WHERE id = ?')
      .get(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const rows = db
      .prepare(
        `SELECT id, subject, description, type_name, priority_name,
                percentage_done, start_date, due_date, bcf_guid
         FROM work_packages WHERE project_id = ? ORDER BY id`,
      )
      .all(projectId) as Array<{
      id: number;
      subject: string;
      description: string;
      type_name: string;
      priority_name: string;
      percentage_done: number;
      start_date: string | null;
      due_date: string | null;
      bcf_guid: string | null;
    }>;

    const elements = rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      description: { format: 'plain', raw: r.description },
      percentageDone: r.percentage_done,
      startDate: r.start_date,
      dueDate: r.due_date,
      _type: 'WorkPackage',
      _links: {
        self: { href: `/api/v3/work_packages/${r.id}` },
        project: { href: `/api/v3/projects/${projectId}` },
        type: { title: r.type_name },
        priority: { title: r.priority_name },
      },
      ...(r.bcf_guid
        ? { _embedded: { customField: { bcfGuid: r.bcf_guid } } }
        : {}),
    }));

    res.json({
      _type: 'Collection',
      count: elements.length,
      _embedded: { elements },
    });
  },
);

app.get('/api/v3/types', (_req: Request, res: Response) => {
  const types = db
    .prepare('SELECT id, name FROM work_package_types ORDER BY id')
    .all();
  res.json({
    _type: 'Collection',
    _embedded: {
      elements: (types as Array<{ id: number; name: string }>).map((t) => ({
        id: t.id,
        name: t.name,
        _type: 'Type',
      })),
    },
  });
});

const HOST = process.env.HOST ?? '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`[pm-core] listening on http://${HOST}:${PORT}`);
});
