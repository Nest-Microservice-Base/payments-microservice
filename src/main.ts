import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

// -------- App Hybri Rest Api + Microservice --------
async function bootstrap() {
  const logger = new Logger('Main-Payments');

  // Config Rest Api
  // rawbody: solicitud de stripe
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Config Microservice
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.NATS,
      options: {
        servers: envs.natsServers,
      },
    },
    {
      // Sharing configuration, pipes, filter, exception ...etc
      inheritAppConfig: true,
    },
  );

  // running microservice
  await app.startAllMicroservices();

  await app.listen(envs.port);
  logger.log(`Payments Microservice running on port ${envs.port}`);
}
bootstrap();
