CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
    paid_by UUID NOT NULL REFERENCES users(id),
    description VARCHAR(255) NOT NULL,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'COP',
    split_type VARCHAR(20) NOT NULL DEFAULT 'equal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS expense_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    share_amount NUMERIC(12,2) NOT NULL CHECK (share_amount >= 0),
    owed_amount NUMERIC(12,2) NOT NULL CHECK (owed_amount >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (expense_id, user_id)
);

CREATE TABLE IF NOT EXISTS balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    debtor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creditor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (debtor_id <> creditor_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_balances_unique_group
ON balances (debtor_id, creditor_id, group_id)
WHERE group_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_balances_unique_without_group
ON balances (debtor_id, creditor_id)
WHERE group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_group_id
ON expenses (group_id);

CREATE INDEX IF NOT EXISTS idx_expenses_paid_by
ON expenses (paid_by);

CREATE INDEX IF NOT EXISTS idx_expense_participants_user_id
ON expense_participants (user_id);

CREATE INDEX IF NOT EXISTS idx_balances_debtor_id
ON balances (debtor_id);

CREATE INDEX IF NOT EXISTS idx_balances_creditor_id
ON balances (creditor_id);
