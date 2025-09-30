import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

import { envs } from './config/envs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Main');

  app.enableCors();

  await app.listen(envs.port);

  logger.log(`🚀 Aplicación ejecutándose en http://localhost:${envs.port}`);
  logger.log(`💡 Esta es la aplicación base. Para usar como proxy, ejecuta:`);
  logger.log(`   caching-proxy --port ${envs.port} --origin <url-origen>`);
}
bootstrap();
