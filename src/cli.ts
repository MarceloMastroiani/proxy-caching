#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import { ProxyServerService } from './proxy-server/proxy-server.service';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('CachingProxy');
const CACHE_FILE = path.join(process.cwd(), '.cache-data');

// Parsear argumentos manualmente (sin yargs para evitar problemas de módulos)
function parseArgs(): { port?: number; origin?: string; clearCache: boolean } {
  const args = process.argv.slice(2);
  const result: { port?: number; origin?: string; clearCache: boolean } = {
    clearCache: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--port' || arg === '-p') {
      result.port = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === '--origin' || arg === '-o') {
      result.origin = args[i + 1];
      i++;
    } else if (arg === '--clear-cache' || arg === '-c') {
      result.clearCache = true;
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    }
  }

  return result;
}

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           🚀 Servidor Proxy con Caché - NestJS               ║
╚════════════════════════════════════════════════════════════════╝

📋 USO:
  caching-proxy --port <número> --origin <url>
  caching-proxy --clear-cache

⚙️  OPCIONES:
  --port, -p        Puerto en el que se ejecutará el servidor proxy
  --origin, -o      URL del servidor de origen
  --clear-cache, -c Limpiar la caché del proxy
  --help, -h        Mostrar esta ayuda

📝 EJEMPLOS:
  caching-proxy --port 3000 --origin http://dummyjson.com
  caching-proxy -p 3000 -o http://dummyjson.com
  caching-proxy --clear-cache

🔗 DOCUMENTACIÓN:
  https://github.com/tu-usuario/caching-proxy
  `);
}

async function main() {
  const argv = parseArgs();

  if (argv.clearCache) {
    logger.log('🧹 Limpiando caché...');
    try {
      if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
        logger.log('✅ Archivo de caché eliminado exitosamente');
      } else {
        logger.log('ℹ️ No se encontró archivo de caché para eliminar');
      }

      // También limpiar caché en memoria si hay una instancia corriendo
      const app = await NestFactory.create(AppModule, { logger: false });
      const proxyServerService = app.get(ProxyServerService);
      proxyServerService.clearCache();
      await app.close();

      logger.log('✅ Caché limpiada exitosamente');
    } catch (error) {
      logger.error('❌ Error al limpiar la caché:', error.message);
    }
    return;
  }

  if (!argv.port || !argv.origin) {
    logger.error('❌ Error: Se requieren los parámetros --port y --origin');
    logger.log('');
    logger.log('💡 Uso: caching-proxy --port <número> --origin <url>');
    logger.log('💡 Ayuda: caching-proxy --help');
    logger.log('');
    process.exit(1);
  }

  // Validar puerto
  if (isNaN(argv.port) || argv.port < 1 || argv.port > 65535) {
    logger.error('❌ Error: El puerto debe ser un número entre 1 y 65535');
    process.exit(1);
  }

  // Validar URL
  try {
    new URL(argv.origin);
  } catch (error) {
    logger.error('❌ Error: La URL de origen no es válida');
    logger.log(`   URL proporcionada: ${argv.origin}`);
    process.exit(1);
  }

  try {
    const app = await NestFactory.create(AppModule);

    // Configurar el servidor de origen
    const proxyServerService = app.get(ProxyServerService);
    proxyServerService.setOriginUrl(argv.origin);

    await app.listen(argv.port);

    console.log('');
    logger.log(
      '╔════════════════════════════════════════════════════════════════╗',
    );
    logger.log(
      '║     🚀 Servidor Proxy con Caché iniciado exitosamente       ║',
    );
    logger.log(
      '╚════════════════════════════════════════════════════════════════╝',
    );
    logger.log('');
    logger.log(`🌐 Servidor local:        http://localhost:${argv.port}`);
    logger.log(`🔗 Servidor de origen:    ${argv.origin}`);
    logger.log(`📦 Sistema de caché:      ✅ Activado`);
    logger.log('');
    logger.log('📊 ENDPOINTS ESPECIALES:');
    logger.log(
      `   • Estadísticas:  http://localhost:${argv.port}/__cache-stats`,
    );
    logger.log(
      `   • Limpiar caché: http://localhost:${argv.port}/__clear-cache`,
    );
    logger.log('');
    logger.log('💡 COMANDOS ÚTILES:');
    logger.log('   • Detener servidor: Ctrl+C');
    logger.log('   • Limpiar caché:    caching-proxy --clear-cache');
    logger.log('');
    logger.log('🎯 El proxy está listo para recibir peticiones...');
    logger.log('');
  } catch (error) {
    logger.error('❌ Error al iniciar el servidor:', error.message);

    if (error.code === 'EADDRINUSE') {
      logger.error(`   El puerto ${argv.port} ya está en uso`);
      logger.log('   💡 Prueba con otro puerto: --port 3001');
    }

    process.exit(1);
  }
}

main().catch((error) => {
  logger.error('Error fatal:', error);
  process.exit(1);
});
