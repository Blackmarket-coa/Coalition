import { Migration } from '@mikro-orm/migrations';

export class Migration202603090002 extends Migration {
    async up(): Promise<void> {
        this.addSql(`CREATE EXTENSION IF NOT EXISTS postgis;`);

        this.addSql(`
      CREATE TABLE IF NOT EXISTS "aid_post" (
        "id" text NOT NULL,
        "customer_id" text NOT NULL,
        "type" text NOT NULL CHECK ("type" IN ('need','offer')),
        "category" text NOT NULL CHECK ("category" IN ('food','transport','labor','materials','care','housing','childcare','eldercare','tech_support','other')),
        "title" text NOT NULL,
        "description" text NOT NULL,
        "location" geometry(Point,4326) NOT NULL,
        "display_radius" integer NOT NULL DEFAULT 400,
        "urgency" text NOT NULL CHECK ("urgency" IN ('low','medium','high','critical')) DEFAULT 'medium',
        "expires_at" timestamptz NULL,
        "status" text NOT NULL CHECK ("status" IN ('open','in_progress','fulfilled','expired','cancelled')) DEFAULT 'open',
        "fulfiller_id" text NULL,
        "fulfilled_at" timestamptz NULL,
        "metadata" jsonb NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "aid_post_pkey" PRIMARY KEY ("id")
      );
    `);

        this.addSql(`
      CREATE TABLE IF NOT EXISTS "aid_response" (
        "id" text NOT NULL,
        "aid_post_id" text NOT NULL,
        "responder_id" text NOT NULL,
        "message" text NOT NULL,
        "status" text NOT NULL CHECK ("status" IN ('pending','accepted','declined')) DEFAULT 'pending',
        "matrix_room_id" text NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "aid_response_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "aid_response_aid_post_fk" FOREIGN KEY ("aid_post_id") REFERENCES "aid_post"("id") ON UPDATE CASCADE ON DELETE CASCADE
      );
    `);

        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_aid_post_location" ON "aid_post" USING GIST ("location");`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_aid_post_customer_id" ON "aid_post" ("customer_id");`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_aid_post_status_type" ON "aid_post" ("status", "type");`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_aid_response_aid_post_id" ON "aid_response" ("aid_post_id");`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_aid_response_responder_id" ON "aid_response" ("responder_id");`);
    }

    async down(): Promise<void> {
        this.addSql(`DROP TABLE IF EXISTS "aid_response" CASCADE;`);
        this.addSql(`DROP TABLE IF EXISTS "aid_post" CASCADE;`);
    }
}
