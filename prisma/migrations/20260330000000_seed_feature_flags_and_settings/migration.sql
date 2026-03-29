-- Data migration: seed feature flags and system settings
-- Uses INSERT ... ON CONFLICT to be idempotent (safe to run multiple times)
-- Only inserts missing rows, never overwrites existing enabled/value state

INSERT INTO feature_flags (id, key, enabled, description, "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'recurring_transactions', true, 'Recurring transaction automation', NOW(), NOW()),
    (gen_random_uuid()::text, 'csv_import', true, 'CSV transaction import', NOW(), NOW()),
    (gen_random_uuid()::text, 'goals', true, 'Savings goals', NOW(), NOW()),
    (gen_random_uuid()::text, 'invoices', true, 'Invoicing module (clients, entries, invoices)', NOW(), NOW()),
    (gen_random_uuid()::text, 'ai_features', false, 'AI-powered features (coming soon)', NOW(), NOW()),
    (gen_random_uuid()::text, 'bulk_pdf_export', false, 'Bulk PDF report export (premium)', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO system_settings (id, key, value, label, "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'invoice_due_days', '30', 'Default invoice due date (days from issue)', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label;
