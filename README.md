# 🚀 Servidor Proxy con Caché

Servidor proxy HTTP con sistema de caché inteligente construido con NestJS.

## ✨ ¿Qué hace?

- **Proxy HTTP**: Reenvía peticiones a un servidor de origen
- **Sistema de Caché**: Guarda respuestas GET para mejorar el rendimiento
- **Headers Informativos**: `X-Cache: HIT` (desde caché) o `X-Cache: MISS` (desde servidor)
- **CLI Simple**: Comandos fáciles de usar

## 📦 Instalación

```bash
# Instalar dependencias
pnpm install

# Construir el proyecto
pnpm run build
```

## 🚀 Uso

### Iniciar el Proxy

```bash
node dist/cli.js --port 3000 --origin http://dummyjson.com
```

### Hacer Peticiones

```bash
# Primera petición (consulta el servidor)
curl http://localhost:3000/products
# X-Cache: MISS

# Segunda petición (viene de caché)
curl http://localhost:3000/products
# X-Cache: HIT ⚡
```

### Limpiar Caché

```bash
node dist/cli.js --clear-cache
```

## 📊 Endpoints Especiales

```bash
# Ver estadísticas de caché
curl http://localhost:3000/__cache-stats

# Limpiar caché via HTTP
curl http://localhost:3000/__clear-cache
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env`:

```env
PORT=3003
```

### Personalizar Caché

Edita `src/proxy-server/proxy-server.service.ts`:

```typescript
private readonly cache = new NodeCache({
  stdTTL: 600,        // 10 minutos
  checkperiod: 120,   // Verificar cada 2 minutos
});
```

## 📝 Comandos

```bash
# Desarrollo
pnpm run start:dev

# Producción
pnpm run build
pnpm run start:prod

# Linter
pnpm run lint

# Tests
pnpm run test
```

## 🔧 Opciones CLI

| Opción          | Alias | Descripción                |
| --------------- | ----- | -------------------------- |
| `--port`        | `-p`  | Puerto del servidor proxy  |
| `--origin`      | `-o`  | URL del servidor de origen |
| `--clear-cache` | `-c`  | Limpiar caché              |
| `--help`        | `-h`  | Mostrar ayuda              |

## 📂 Estructura

```
src/
├── proxy-server/
│   ├── proxy-server.controller.ts  # Maneja peticiones HTTP
│   ├── proxy-server.service.ts     # Lógica de caché
│   └── entities/                   # Interfaces
├── config/
│   └── envs.ts                     # Configuración de entorno
├── cli.ts                          # CLI del proxy
└── main.ts                         # Aplicación NestJS
```

## 💡 Ejemplos

### Ejemplo 1: API de productos

```bash
# Iniciar proxy
node dist/cli.js --port 3000 --origin http://dummyjson.com

# Obtener productos
curl http://localhost:3000/products
```

### Ejemplo 2: Con query params

```bash
curl "http://localhost:3000/products?limit=5"
```

### Ejemplo 3: Ver estadísticas

```bash
curl http://localhost:3000/__cache-stats | jq
```

## 🐛 Solución de Problemas

### Puerto en uso

```bash
# Error: EADDRINUSE
# Solución: Usa otro puerto
node dist/cli.js --port 3001 --origin http://dummyjson.com
```

### URL inválida

```bash
# ❌ Incorrecto
--origin dummyjson.com

# ✅ Correcto
--origin http://dummyjson.com
```

## 🛠️ Tecnologías

- **NestJS** - Framework backend
- **Axios** - Cliente HTTP
- **node-cache** - Sistema de caché en memoria
- **TypeScript** - Lenguaje tipado

## 📄 Licencia

MIT

---

**¿Necesitas ayuda?** Abre un issue en GitHub o revisa la documentación de NestJS.
