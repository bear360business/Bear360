import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true })
  const origin = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
  app.enableCors({ origin, credentials: true })
  app.setGlobalPrefix('api/v1')

  const config = new DocumentBuilder()
    .setTitle('Bear 360 API')
    .setDescription('Multi-tenant restaurant OS API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = Number(process.env.PORT ?? 3001)
  await app.listen(port)
  // eslint-disable-next-line no-console
  console.log(`Bear 360 API listening on http://localhost:${port}`)
  // eslint-disable-next-line no-console
  console.log(`OpenAPI: http://localhost:${port}/api/docs`)
}

void bootstrap()
