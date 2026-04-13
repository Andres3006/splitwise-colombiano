const pool = require('./connection');

const ensureSplitwiseSchema = async () => {
    await pool.query(`
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

        CREATE TABLE IF NOT EXISTS friend_requests (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            responded_at TIMESTAMP,
            CHECK (sender_id <> receiver_id)
        );

        CREATE TABLE IF NOT EXISTS friendships (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_one_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            user_two_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CHECK (user_one_id <> user_two_id),
            UNIQUE (user_one_id, user_two_id)
        );

        CREATE TABLE IF NOT EXISTS group_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS wallet_transactions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            transaction_type VARCHAR(30) NOT NULL,
            amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
            reference TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_friend_requests_sender
        ON friend_requests (sender_id);

        CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver
        ON friend_requests (receiver_id);

        CREATE INDEX IF NOT EXISTS idx_friendships_user_one
        ON friendships (user_one_id);

        CREATE INDEX IF NOT EXISTS idx_friendships_user_two
        ON friendships (user_two_id);

        CREATE INDEX IF NOT EXISTS idx_group_messages_group_id
        ON group_messages (group_id);

        CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id
        ON group_messages (sender_id);

        CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id
        ON wallet_transactions (user_id);

        ALTER TABLE groups
        ADD COLUMN IF NOT EXISTS max_members INT NOT NULL DEFAULT 10;

        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0;

        ALTER TABLE groups
        DROP CONSTRAINT IF EXISTS groups_max_members_check;

        ALTER TABLE groups
        ADD CONSTRAINT groups_max_members_check
        CHECK (max_members BETWEEN 3 AND 15);

        ALTER TABLE groups
        ADD COLUMN IF NOT EXISTS description TEXT;

        ALTER TABLE loans
        ADD COLUMN IF NOT EXISTS description TEXT;

        ALTER TABLE group_invitations
        DROP CONSTRAINT IF EXISTS group_invitations_group_id_fkey;

        ALTER TABLE group_invitations
        ADD CONSTRAINT group_invitations_group_id_fkey
        FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;
    `);
};

module.exports = { ensureSplitwiseSchema };
