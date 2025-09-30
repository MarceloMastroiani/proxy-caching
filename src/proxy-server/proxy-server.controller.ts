import {
  Controller,
  Get,
  Logger,
  All,
  Res,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ProxyServerService } from './proxy-server.service';
import { Request, Response } from 'express';
import { error } from 'console';

@Controller()
export class ProxyServerController {
  logger = new Logger('ProxyServerController');

  constructor(private readonly proxyServerService: ProxyServerService) {}

  //Estadisticas de Cache
  @Get('__cache-stats')
  getCacheStats() {
    const stats = this.proxyServerService.getCacheStats();
    return {
      messaje: 'Estadisticas de Cache',
      servidor_origen: this.proxyServerService.getOriginUrl(),
      ...stats,
    };
  }

  //Limpiar Cache
  @Get('__clear-cache')
  clearCache() {
    this.proxyServerService.clearCache();
    return {
      messaje: 'Cache limpiada',
      timestamp: new Date().toISOString(),
    };
  }

  //Maneja todas las rutas y métodos HTTP (excepto las rutas especiales arriba)
  @All('*')
  async handleRequest(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const { method, path, headers, body, query } = request;

    // Evitar procesar rutas especiales del sistema
    if (path.startsWith('/__')) {
      return;
    }

    // Verificar si el servidor de origen está configurado
    if (!this.proxyServerService.getOriginUrl()) {
      throw new HttpException(
        {
          error: 'No se ha configurado la URL de origen',
          messaje: 'Use --origin <url> al iniciar el proxy',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      this.logger.log(`Procesando solicitud: ${method} ${path}`);

      // Realizar la petición (con caché o al servidor)
      const proxyResponse = await this.proxyServerService.makeRequest({
        method,
        path,
        headers: headers as Record<string, string>,
        body,
        query: query as Record<string, string>,
      });

      // Configurar headers de respuesta
      Object.entries(proxyResponse.headers).forEach(([key, value]) => {
        try {
          response.setHeader(key, value);
        } catch (error) {
          // Ignorar headers problemáticos
          this.logger.warn(
            `No se pudo establecer header ${key}: ${error.message}`,
          );
        }
      });

      // Agregar header X-Cache (requerimiento principal)
      response.setHeader('X-Cache', proxyResponse.fromCache ? 'HIT' : 'MISS'); //Esto sirve para saber si la respuesta proviene de la cache

      // Agregar headers informativos adicionales
      response.setHeader('X-Proxy-Server', 'NestJS-Caching-Proxy');
      response.setHeader(
        'X-Origin-Server',
        this.proxyServerService.getOriginUrl(),
      );
      response.setHeader('X-Cache-Timestamp', new Date().toISOString());

      // Configurar código de estado y enviar respuesta
      response.status(proxyResponse.status);

      // Determinar el tipo de respuesta basado en content-type
      const contentType = proxyResponse.headers['content-type'] || '';

      if (contentType.includes('application/json')) {
        response.json(proxyResponse.data);
      } else if (contentType.includes('text/')) {
        // Para otros tipos de contenido
        response.send(proxyResponse.data);
      }

      this.logger.log(
        'Respuesta enviada: ${proxyResponse.status} ${proxyResponse.statusText}' +
          `(${proxyResponse.fromCache ? 'CACHE' : 'ORIGIN'})`,
      );
    } catch (error) {
      this.logger.error(
        'Respuesta enviada: ${method} ${path}: ${error.message}',
      );

      if (error.response) {
        // Error de la petición HTTP al servidor de origen
        const errorStatus = error.response.status || HttpStatus.BAD_GATEWAY;

        // Reenviar headers del error si existen
        if (error.response.headers) {
          Object.entries(error.response.headers).forEach(([key, value]) => {
            try {
              response.setHeader(key, value as string);
            } catch (headerError) {
              this.logger.warn(
                `No se pudo establecer header ${key}: ${headerError.message}`,
              );
            }
          });
        }

        response.setHeader('X-Cache', 'MISS');
        response.setHeader('X-Proxy-Error', 'origin-server-error');

        response.status(errorStatus);

        // Enviar la respuesta de error del servidor original si existe
        if (error.response.data) {
          const contentType = error.response.headers?.['content-type'] || '';

          if (contentType.includes('application/json')) {
            response.json(error.response.data);
          } else {
            response.send(error.response.data);
          }
        } else {
          response.json({
            error: 'Error en el servidor de origen',
            messaje: error.message,
            statusCode: errorStatus,
          });
        }
      } else {
        // Error interno del proxy
        response.setHeader('X-Cache', 'MISS');
        response.setHeader('X-Proxy-Error', 'internal-error');

        response.status(HttpStatus.INTERNAL_SERVER_ERROR);
        response.json({
          error: 'Error interno del proxy',
          messaje: error.message,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        });
      }
    }
  }
}
