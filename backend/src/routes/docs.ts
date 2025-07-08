import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

const router = Router();

// 開発環境でのみSwagger UIを有効化
if (process.env.NODE_ENV !== 'production') {
  const swaggerDocument = YAML.load(path.join(__dirname, '../../docs/openapi.yaml'));
  
  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'L4L6 API Documentation',
  }));
}

export default router;