import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/all-exceptions.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const originEnv = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  const origin = originEnv === '*'
    ? true
    : originEnv.includes(',')
      ? originEnv.split(',').map((s) => s.trim())
      : originEnv
  app.enableCors({ origin, credentials: true })

  // Handle root route for health / status preview
  const httpAdapter = app.getHttpAdapter()
  httpAdapter.get('/', (_req: any, res: any) => {
    res.json({
      status: 'ok',
      service: 'Bear 360 API',
      version: '0.1.0',
      docs: '/api/docs',
      health: '/api/v1/health',
    })
  })

  app.setGlobalPrefix('api/v1')
  app.useGlobalFilters(new AllExceptionsFilter())

  const config = new DocumentBuilder()
    .setTitle('Bear 360 API')
    .setDescription('Multi-tenant restaurant OS API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`Bear 360 API listening on http://0.0.0.0:${port}`)
  // eslint-disable-next-line no-console
  console.log(`OpenAPI: http://localhost:${port}/api/docs`)
}

void bootstrap()
