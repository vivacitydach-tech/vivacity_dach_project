import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { BypassEnvelope } from '../../common/decorators/bypass-envelope.decorator';
import { OPENAPI_YAML } from './openapi-spec';

@Controller()
@BypassEnvelope()
export class DocsController {
  @Get('openapi.yaml')
  @Header('Content-Type', 'text/yaml; charset=utf-8')
  getOpenApiYaml(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    return res.send(OPENAPI_YAML);
  }

  @Get('docs')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getDocs(@Res() res: Response) {
    const html = `<!doctype html>
<html lang="en">
  <head>
    <title>Target Enterprise — API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; background: #0f172a; }
    </style>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/v1/openapi.yaml"
      data-configuration='{"theme":"purple","layout":"modern","hideModels":false}'>
    </script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Get('swagger')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getSwagger(@Res() res: Response) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Target Enterprise API — Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/v1/openapi.yaml",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }
}
