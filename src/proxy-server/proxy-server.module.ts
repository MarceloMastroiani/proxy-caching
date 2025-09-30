import { Module } from '@nestjs/common';
import { ProxyServerService } from './proxy-server.service';
import { ProxyServerController } from './proxy-server.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 segundos de timeout
      maxRedirects: 5, // Máximo 5 redirecciones
      validateStatus: () => true, // Permitir todos los códigos de estado
    }),
  ],
  controllers: [ProxyServerController],
  providers: [ProxyServerService],
})
export class ProxyServerModule {}
