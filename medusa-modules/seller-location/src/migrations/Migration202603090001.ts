import { Migration } from '@mikro-orm/migrations';

export class Migration202603090001 extends Migration {
    async up(): Promise<void> {
        this.addSql(`CREATE EXTENSION IF NOT EXISTS postgis;`);

        this.addSql(`
      CREATE TABLE IF NOT EXISTS "seller_location" (
        "id" text NOT NULL,
        "seller_id" text NOT NULL,
        "longitude" double precision NOT NULL,
        "latitude" double precision NOT NULL,
        "coordinates" geometry(Point,4326) NOT NULL,
        "address_line" text NOT NULL,
        "city" text NOT NULL,
        "state" text NOT NULL,
        "zip" text NOT NULL,
        "country" text NOT NULL,
        "display_radius" integer NOT NULL DEFAULT 250,
        "is_visible" boolean NOT NULL DEFAULT true,
        "location_type" text NOT NULL CHECK ("location_type" IN ('storefront','farm','kitchen','garden','mobile','online_only')),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "seller_location_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "seller_location_seller_id_unique" UNIQUE ("seller_id")
      );
    `);

        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_location_coordinates" ON "seller_location" USING GIST ("coordinates");`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_location_seller_id" ON "seller_location" ("seller_id");`);
    }

    async down(): Promise<void> {
        this.addSql(`DROP TABLE IF EXISTS "seller_location" CASCADE;`);
    }
}
