import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const logger = new Logger("main.ts");

/**
 setupSwagger
 * @param {any} app -
 * @returns {any} -
 */
function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("1Inch Cross-Chain Swap v0.1 API")
    .setDescription("1Inch Cross-Chain Swap API documentation")
    .setVersion("0.1")
    .addTag("aptos", "Aptos blockchain operations")
    .addTag("evm", "EVM blockchain operations")
    .addTag("swap-evm-to-aptos", "EVM to Aptos cross-chain swaps")
    .addTag("swap-aptos-to-evm", "Aptos to EVM cross-chain swaps")
    .addSecurity("bearerAuth", {
      type: "http",
      scheme: "Bearer",
    })
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  });
  const endpointRelativePath = "/api";

  SwaggerModule.setup(endpointRelativePath, app, document, {
    swaggerOptions: {
      security: [{ bearerAuth: [] }],
    },
  });

  app.use((req, res, next) => {
    if (req.url?.includes("swagger-ui-init.js")) {
      res.set("Last-Modified", new Date().toUTCString());
      res.set("Cache-Control", "no-cache");
      res.set("Pragma", "no-cache");
    }
    next();
  });
}

/**
 bootstrap
 * @returns {any} -
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const serverConfig = app.get(ConfigService);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({ credentials: true });
  setupSwagger(app);
  await app.listen(serverConfig.get("PORT", 3345), () => {
    logger.log(
      `Service listen on: ${serverConfig.get("HOST", "localhost")}:${serverConfig.get("PORT", 3345)}`,
      "main.ts",
    );
  });
}

bootstrap();
