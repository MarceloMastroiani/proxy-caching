import { Module } from '@nestjs/common';
import { ProxyServerModule } from './proxy-server/proxy-server.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 segundos de timeout
      maxRedirects: 5, // Máximo 5 redirecciones
    }),
    ProxyServerModule,
  ],
})
export class AppModule {}
