import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import pg from "pg";

export const PG_POOL = Symbol("PG_POOL");

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return new pg.Pool({
          connectionString: config.getOrThrow<string>("DATABASE_URL"),
          max: 10,
        });
      },
    },
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
