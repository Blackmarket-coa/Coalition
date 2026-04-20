import { Migration } from '@mikro-orm/migrations';

export class Migration202604010001 extends Migration {
    async up(): Promise<void> {
        this.addSql(`
      CREATE TABLE IF NOT EXISTS "entitlement" (
        "id" text NOT NULL,
        "user_id" text NOT NULL,
        "product_id" text NOT NULL,
        "seller_id" text NULL,
        "source" text NOT NULL DEFAULT 'one_off' CHECK ("source" IN ('one_off','subscription','tip','free')),
        "source_payment_id" text NULL,
        "stripe_subscription_id" text NULL,
        "status" text NOT NULL DEFAULT 'active' CHECK ("status" IN ('active','expired','revoked')),
        "granted_at" timestamptz NOT NULL DEFAULT now(),
        "expires_at" timestamptz NULL,
        "revoked_at" timestamptz NULL,
        "currency_code" text NULL,
        "amount_cents" integer NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "deleted_at" timestamptz NULL,
        CONSTRAINT "entitlement_pkey" PRIMARY KEY ("id")
      );
    `);

        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_entitlement_user_id" ON "entitlement" ("user_id");`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_entitlement_product_id" ON "entitlement" ("product_id");`);
        this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_entitlement_stripe_subscription_id" ON "entitlement" ("stripe_subscription_id");`);
        this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_entitlement_user_product_source" ON "entitlement" ("user_id", "product_id", "source") WHERE "deleted_at" IS NULL;`);
    }

    async down(): Promise<void> {
        this.addSql(`DROP TABLE IF EXISTS "entitlement" CASCADE;`);
    }
}
