-- Create inventory_stock table
CREATE TABLE IF NOT EXISTS "inventory_stock" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" uuid REFERENCES products(id),
    "warehouse_id" uuid REFERENCES warehouses(id),
    "quantity" integer DEFAULT 0,
    "reserved_qty" integer DEFAULT 0,
    "updated_at" timestamp DEFAULT NOW(),
    UNIQUE(product_id, warehouse_id)
);

-- Create inventory_movements table
CREATE TABLE IF NOT EXISTS "inventory_movements" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "product_id" uuid REFERENCES products(id),
    "warehouse_id" uuid REFERENCES warehouses(id),
    "type" text NOT NULL,
    "quantity" integer NOT NULL,
    "reference" text,
    "reference_id" text,
    "notes" text,
    "created_at" timestamp DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "inventory_stock_product_idx" ON "inventory_stock"("product_id");
CREATE INDEX IF NOT EXISTS "inventory_stock_warehouse_idx" ON "inventory_stock"("warehouse_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_product_idx" ON "inventory_movements"("product_id");
CREATE INDEX IF NOT EXISTS "inventory_movements_type_idx" ON "inventory_movements"("type");
CREATE INDEX IF NOT EXISTS "inventory_movements_created_idx" ON "inventory_movements"("created_at");
