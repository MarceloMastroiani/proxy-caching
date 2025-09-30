import 'dotenv/config';
import * as z from 'zod';

interface EnvVars {
  PORT: number;
}

const envsSchema = z
  .object({
    PORT: z.coerce.number(), // ← Convierte string a number automáticamente
  })
  .passthrough(); // ← Permite cualquier otra variable

const { error, data } = envsSchema.safeParse(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envsVars: EnvVars = data;

export const envs = {
  port: envsVars.PORT,
};
