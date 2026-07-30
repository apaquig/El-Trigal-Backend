# El Trigal API

API REST independiente para el website Astro y el panel Angular de El Trigal.

## Stack

- Node.js 24 LTS.
- NestJS 11 con TypeScript estricto.
- MongoDB Atlas con Mongoose.
- Cloudinary Node SDK, cargas firmadas y confirmacion server-side.
- DTOs con `class-validator`/`class-transformer`, `whitelist` y `forbidNonWhitelisted`.
- Argon2id, JWT access de 15 minutos y refresh token rotativo en cookie `HttpOnly`.
- OpenAPI en runtime fuera de produccion y artefacto versionado en `openapi/el-trigal-api.v1.json`.

## Comandos

```bash
npm install
npm run build
npm run lint
npm test
npm run test:e2e
npm run db:indexes
npm run seed:dev
npm run start:dev
```

La API usa `/api/v1` como base URL. Los health checks quedan en `/health/live` y `/health/ready` para contenedores.

## Variables

Copia `.env.example` a `.env` y completa los secretos. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `CLOUDINARY_API_SECRET` nunca deben llegar al cliente. `PUBLIC_ORIGINS` y `ADMIN_ORIGINS` son listas separadas por coma.

## OpenAPI

- Desarrollo: `GET /api/v1/docs` y `GET /api/v1/docs-json`.
- Artefacto versionado: `openapi/el-trigal-api.v1.json`.
- Regeneracion desde decorators: `npm run openapi:generate`.

En produccion el Swagger runtime no se expone por defecto.

## Seguridad operacional

- No se devuelven hashes, secretos, tokens refresh, IPs completas ni stack traces.
- Los errores salen con codigos estables y envelope uniforme.
- Los operadores MongoDB (`$ne`, `$where`, claves con punto, etc.) se rechazan en payloads.
- El refresh token se guarda solo como HMAC y rota en cada uso; si se detecta reutilizacion de una sesion revocada, se revoca toda la familia.
- Cloudinary solo acepta `publicId` bajo `el-trigal/` y `secureUrl` de la cuenta configurada.

## Backups y restauracion

Usa snapshots de MongoDB Atlas para backups programados y `mongodump` para respaldos puntuales antes de migraciones grandes:

```bash
mongodump --uri "$MONGODB_URI" --archive=backup.archive --gzip
mongorestore --uri "$MONGODB_URI" --archive=backup.archive --gzip --drop
```

Antes de restaurar produccion, valida en un cluster temporal, ejecuta `npm run db:indexes` y prueba `/health/ready`.
# El-Trigal-Backend
