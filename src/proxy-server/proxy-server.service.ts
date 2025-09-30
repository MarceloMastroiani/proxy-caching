import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import * as NodeCache from 'node-cache';
import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  CachedResponse,
  ProxyRequestOptions,
} from './entities/proxy-server.entity';

@Injectable()
export class ProxyServerService {
  private readonly logger = new Logger('ProxyServerService');
  private readonly cache = new NodeCache({
    stdTTL: 600, // TTL por defecto de 10 minutos
    checkperiod: 120, // Verificar elementos expirados cada 2 minutos
    useClones: false, // Mejora rendimiento
  });
  private originUrl: string;

  constructor(private readonly httpService: HttpService) {}

  //* Configura la URL del servidor de origen
  setOriginUrl(url: string): void {
    // Limpiar URL de origen (quitar slash final si existe)
    this.originUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    this.logger.log(`URL de origen configurada: ${this.originUrl}`);
  }

  //* Obtiene la URL del servidor de origen
  getOriginUrl(): string {
    return this.originUrl;
  }

  //* Realiza una petición con caché
  async makeRequest(options: ProxyRequestOptions): Promise<{
    data: any;
    headers: Record<string, string>;
    status: number;
    statusText: string;
    fromCache: boolean;
  }> {
    const { method, path, headers, body, query } = options;
    const cacheKey = this.generateCacheKey(method, path, headers, query);

    // Solo cachear peticiones GET por defecto
    const shouldCache = method.toUpperCase() === 'GET';

    if (shouldCache) {
      //Intentar obtener de la cache
      const cachedResponse = this.cache.get<CachedResponse>(cacheKey);

      if (cachedResponse) {
        this.logger.log(`Cache HIT para: ${method} ${path}`);
        return {
          ...cachedResponse,
          fromCache: true,
        };
      }
    }

    //Si no está en caché, hacer petición al servidor de origen
    this.logger.log(
      `Cache MISS para: ${method} ${path} - Consultando servidor de origen`,
    );
    try {
      const targetUrl = `${this.originUrl}${path}`; //Construir URL completa
      const queryString = query ? this.buildQueryString(query) : ''; //Construir query string si existe
      const fullUrl = queryString ? `${targetUrl}?${queryString}` : targetUrl; //Construir URL completa con query string si existe

      const requestConfig: AxiosRequestConfig = {
        method: method as any,
        url: fullUrl,
        headers: this.sanitizeRequestHeaders(headers), //Sanitizar cabeceras de petición
        timeout: 30000,
      };

      //Agregar body para métodos que lo soportan
      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        requestConfig.data = body;
      }

      const response: AxiosResponse = await firstValueFrom(
        this.httpService.request(requestConfig),
      );

      const responseToReturn = {
        data: response.data,
        headers: this.sanitizeResponseHeaders(response.headers),
        status: response.status,
        statusText: response.statusText,
        fromCache: false,
      };

      // Guardar en caché solo peticiones GET exitosas
      if (shouldCache && response.status >= 200 && response.status < 300) {
        const responseToCache: CachedResponse = {
          ...responseToReturn,
          timestamp: Date.now(),
        };

        this.cache.set(cacheKey, responseToCache);
        this.logger.log(`Respuesta guardada en caché: ${method} ${path}`);
      }
      return responseToReturn;
    } catch (error) {
      this.logger.error(
        `Error al consultar el servidor de origen: ${error.message}`,
      );

      // Reenviar error con información adicional
      if (error.response) {
        throw {
          ...error,
          response: {
            ...error.response,
            data: error.response.data,
            status: error.response.status,
            statusText: error.response.statusText,
            headers: this.sanitizeResponseHeaders(error.response.headers || {}),
          },
        };
      }

      throw error;
    }
  }

  //* Limpia toda la cache
  clearCache(): void {
    const keys = this.cache.keys();
    this.cache.flushAll();
    this.logger.log(`Caché limpiada. Se eliminaron ${keys.length} elementos`);
  }

  //* Obtiene estadísticas de la cache
  getCacheStats(): {
    keys: number;
    hits: number;
    misses: number;
    ksize: number;
    vsize: number;
  } {
    return this.cache.getStats();
  }

  //* Obtiene información de la cache
  getCacheInfo(): {
    totalKeys: number;
    stats: any;
    keys: string[];
  } {
    const keys = this.cache.keys();
    const stats = this.cache.getStats();

    return {
      totalKeys: keys.length,
      stats,
      keys: keys.slice(0, 10), // Solo mostrar las primeras 10 claves
    };
  }

  //* Genera una clave única para la caché
  private generateCacheKey(
    method: string,
    path: string,
    headers: Record<string, string>,
    query?: Record<string, string>,
  ): string {
    //Crear una clave que incluya el método, path, query y headers relevantes
    const relevantHeaders = this.getRelevantHeaders(headers);
    const queryString = query ? JSON.stringify(query) : '';
    const headersString = JSON.stringify(relevantHeaders);

    const baseKey = `${method.toUpperCase()}:${path}:${queryString}`;
    const headersHash = Buffer.from(headersString)
      .toString('base64')
      .slice(0, 10); // Limitar a 10 caracteres

    return `${baseKey}:${headersHash}`;
  }

  //* Obtiene solo los headers relevantes para el cache
  private getRelevantHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const relevant = [
      'accept',
      'content-type',
      'authorization',
      'accept-lenguage',
      'accept-encoding',
    ];
    const result: Record<string, string> = {};

    //Filtrar y almacenar los headers relevantes
    for (const [key, value] of Object.entries(headers)) {
      if (relevant.includes(key.toLowerCase())) {
        result[key.toLowerCase()] = value;
      }
    }

    return result;
  }

  //* Limpia headers de request que no deberían ser enviados al servidor de origen
  private sanitizeRequestHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const headersToRemove = [
      'host',
      'connection',
      'x-forwarded-for',
      'x-forwarded-proto',
      'x-forwarded-host',
      'x-real-ip',
    ];

    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (!headersToRemove.includes(key.toLowerCase()) && value) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  //* Limpia headers de respuesta que no deberían ser enviados al cliente
  private sanitizeResponseHeaders(
    headers: Record<string, any>,
  ): Record<string, string> {
    const headersToRemove = [
      'connection',
      'transfer-encoding',
      'content-encoding',
      'content-length',
      'server',
    ];

    const sanitized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (
        !headersToRemove.includes(key.toLowerCase()) &&
        typeof value === 'string'
      ) {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  //* Construye query string desde objeto
  private buildQueryString(query: Record<string, string>): string {
    return Object.entries(query)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join('&');
  }
}
