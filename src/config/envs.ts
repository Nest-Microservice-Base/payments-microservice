import 'dotenv/config';
import * as joi from 'joi';

// interface type data variables
interface EnvVars {
  PORT: number;

  // Config variable stripe
  STRIPE_SECRET: string;
  STRIPE_SUCCESS_URL: string;
  STRIPE_CANCEL_URL: string;
  STRIPE_ENDPOINT_SECRET: string;

  NATS_SERVERS: string[];
}

// schema validation
const envsSchema = joi
  .object({
    PORT: joi.number().required(),

    STRIPE_SECRET: joi.string().required(),
    STRIPE_SUCCESS_URL: joi.string().required(),
    STRIPE_CANCEL_URL: joi.string().required(),
    STRIPE_ENDPOINT_SECRET: joi.string().required(),

    NATS_SERVERS: joi.array().items(joi.string()).required(),
  })
  .unknown(true);

// validation schema
const { error, value } = envsSchema.validate({
  ...process.env,
  NATS_SERVERS: process.env.NATS_SERVERS?.split(','),
});

if (error) {
  throw new Error(
    `Configuration validation variable enviroment error: ${error.message}`,
  );
}

// assign values validate in EnvVars
const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,

  stripeSecret: envVars.STRIPE_SECRET,
  stripeSuccessUrl: envVars.STRIPE_SUCCESS_URL,
  stripeCancelUrl: envVars.STRIPE_CANCEL_URL,
  stripeEndpointSecret: envVars.STRIPE_ENDPOINT_SECRET,

  natsServers: envVars.NATS_SERVERS,
};
