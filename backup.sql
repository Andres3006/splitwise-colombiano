--
-- PostgreSQL database dump
--

\restrict JROvsQmzObThL3bbUIBYrJ2aZT2uCKkDGHPTOT0aTtWT7LDUYlToujwkJq6QOim

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: check_overdue_loans(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_overdue_loans() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NEW.due_date < NOW() AND NEW.status != 'paid' THEN
        UPDATE users
        SET is_banned = TRUE
        WHERE id = NEW.borrower_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.check_overdue_loans() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.balances (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid,
    debtor_id uuid NOT NULL,
    creditor_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT balances_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT balances_check CHECK ((debtor_id <> creditor_id))
);


ALTER TABLE public.balances OWNER TO postgres;

--
-- Name: bans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    reason text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


ALTER TABLE public.bans OWNER TO postgres;

--
-- Name: expense_participants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expense_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    expense_id uuid NOT NULL,
    user_id uuid NOT NULL,
    share_amount numeric(12,2) NOT NULL,
    owed_amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT expense_participants_owed_amount_check CHECK ((owed_amount >= (0)::numeric)),
    CONSTRAINT expense_participants_share_amount_check CHECK ((share_amount >= (0)::numeric))
);


ALTER TABLE public.expense_participants OWNER TO postgres;

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid,
    paid_by uuid NOT NULL,
    description character varying(255) NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    currency character varying(10) DEFAULT 'COP'::character varying NOT NULL,
    split_type character varying(20) DEFAULT 'equal'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT expenses_total_amount_check CHECK ((total_amount > (0)::numeric))
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- Name: friend_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.friend_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    responded_at timestamp without time zone,
    CONSTRAINT friend_requests_check CHECK ((sender_id <> receiver_id))
);


ALTER TABLE public.friend_requests OWNER TO postgres;

--
-- Name: friendships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.friendships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_one_id uuid NOT NULL,
    user_two_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT friendships_check CHECK ((user_one_id <> user_two_id))
);


ALTER TABLE public.friendships OWNER TO postgres;

--
-- Name: group_invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_invitations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid,
    invited_user_id uuid,
    invited_by uuid,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.group_invitations OWNER TO postgres;

--
-- Name: group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    group_id uuid,
    role character varying(20) DEFAULT 'member'::character varying,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    left_at timestamp without time zone
);


ALTER TABLE public.group_members OWNER TO postgres;

--
-- Name: group_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.group_messages (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.group_messages OWNER TO postgres;

--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    is_private boolean DEFAULT false,
    created_by uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    max_members integer DEFAULT 10 NOT NULL,
    description text,
    CONSTRAINT groups_max_members_check CHECK (((max_members >= 2) AND (max_members <= 50)))
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: loans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.loans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    group_id uuid,
    lender_id uuid,
    borrower_id uuid,
    amount numeric(12,2) NOT NULL,
    interest_rate numeric(5,2) DEFAULT 0.10,
    total_amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    due_date timestamp without time zone NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    description text,
    CONSTRAINT due_date_check CHECK ((due_date <= (created_at + '15 days'::interval))),
    CONSTRAINT interest_check CHECK ((interest_rate = 0.10)),
    CONSTRAINT loans_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT loans_check CHECK ((lender_id <> borrower_id))
);


ALTER TABLE public.loans OWNER TO postgres;

--
-- Name: payments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    loan_id uuid,
    from_user uuid,
    to_user uuid,
    amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.payments OWNER TO postgres;

--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_stats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    total_lent numeric(12,2) DEFAULT 0,
    total_borrowed numeric(12,2) DEFAULT 0,
    avg_payment_time interval,
    on_time_payments integer DEFAULT 0,
    late_payments integer DEFAULT 0
);


ALTER TABLE public.user_stats OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash text NOT NULL,
    birth_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_banned boolean DEFAULT false,
    credit_limit numeric(12,2) DEFAULT 50000,
    score numeric(5,2) DEFAULT 100,
    role character varying(20) DEFAULT 'user'::character varying,
    wallet_balance numeric(12,2) DEFAULT 0 NOT NULL,
    CONSTRAINT age_check CHECK ((birth_date <= (CURRENT_DATE - '18 years'::interval)))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: wallet_transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    transaction_type character varying(30) NOT NULL,
    amount numeric(12,2) NOT NULL,
    reference text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT wallet_transactions_amount_check CHECK ((amount > (0)::numeric))
);


ALTER TABLE public.wallet_transactions OWNER TO postgres;

--
-- Data for Name: balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.balances (id, group_id, debtor_id, creditor_id, amount, updated_at) FROM stdin;
\.


--
-- Data for Name: bans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.bans (id, user_id, reason, created_at, active) FROM stdin;
\.


--
-- Data for Name: expense_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expense_participants (id, expense_id, user_id, share_amount, owed_amount, created_at) FROM stdin;
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.expenses (id, group_id, paid_by, description, total_amount, currency, split_type, created_at) FROM stdin;
\.


--
-- Data for Name: friend_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.friend_requests (id, sender_id, receiver_id, status, created_at, responded_at) FROM stdin;
\.


--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.friendships (id, user_one_id, user_two_id, created_at) FROM stdin;
\.


--
-- Data for Name: group_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_invitations (id, group_id, invited_user_id, invited_by, status, created_at) FROM stdin;
\.


--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_members (id, user_id, group_id, role, joined_at, left_at) FROM stdin;
\.


--
-- Data for Name: group_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.group_messages (id, group_id, sender_id, message, created_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, name, is_private, created_by, created_at, max_members, description) FROM stdin;
\.


--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.loans (id, group_id, lender_id, borrower_id, amount, interest_rate, total_amount, created_at, due_date, status, description) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.payments (id, loan_id, from_user, to_user, amount, created_at) FROM stdin;
\.


--
-- Data for Name: user_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_stats (id, user_id, total_lent, total_borrowed, avg_payment_time, on_time_payments, late_payments) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, name, email, password_hash, birth_date, created_at, is_banned, credit_limit, score, role, wallet_balance) FROM stdin;
8309c3de-a286-4fc7-bd15-43a2229d2d8c	User2	user2@test.com	$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6	2000-01-01	2026-04-11 06:12:53.037043	f	50000.00	100.00	user	208000.00
82092a97-3a1c-477f-b104-254f6f1b0d69	Admin	admin@test.com	$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6	2000-01-01	2026-04-11 06:12:53.037043	f	50000.00	100.00	user	0.00
28accfca-f97a-4f43-96b6-1f1ca9c53198	User3	user3@test.com	$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6	2000-01-01	2026-04-11 06:12:53.037043	f	50000.00	100.00	user	0.00
cf6f0e95-a20c-40c0-8d5c-7859402a6460	Juan	juan@test.com	$2b$10$baM7k2YoA7XyFCzNDHz14ezpffRduXU7/OG26x8kJTXRzxpQtNosa	2000-01-01	2026-04-11 07:09:55.346028	f	50000.00	100.00	user	0.00
cc0585d4-4a28-4074-a7dc-fd9cfe959e15	edwin	edwin.vasquez3006@gmail.com	$2b$10$FgnsTaugYkdXqdaRupmrJesq.xJv3tJfPLCCPGkJKmBkqSCxtMd.i	2007-06-30	2026-04-11 12:38:35.078707	f	50000.00	100.00	user	0.00
f7b7d18b-38f6-435a-8cd4-92ec75b1e626	User1	user1@test.com	$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6	2000-01-01	2026-04-11 06:12:53.037043	f	50000.00	100.00	user	0.00
\.


--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_transactions (id, user_id, transaction_type, amount, reference, created_at) FROM stdin;
c16587f7-4d65-4a7d-9b9a-37ae267b67b1	8309c3de-a286-4fc7-bd15-43a2229d2d8c	deposit	500000.00	Consignacion a saldo disponible	2026-04-13 02:42:10.180565
a77da8f8-d652-47b2-a0cf-37064e455efc	8309c3de-a286-4fc7-bd15-43a2229d2d8c	withdraw	292000.00	Retiro desde saldo disponible	2026-04-13 02:42:22.498595
\.


--
-- Name: balances balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_pkey PRIMARY KEY (id);


--
-- Name: bans bans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_pkey PRIMARY KEY (id);


--
-- Name: expense_participants expense_participants_expense_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_participants
    ADD CONSTRAINT expense_participants_expense_id_user_id_key UNIQUE (expense_id, user_id);


--
-- Name: expense_participants expense_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_participants
    ADD CONSTRAINT expense_participants_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: friend_requests friend_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_pkey PRIMARY KEY (id);


--
-- Name: friendships friendships_user_one_id_user_two_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_one_id_user_two_id_key UNIQUE (user_one_id, user_two_id);


--
-- Name: group_invitations group_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_pkey PRIMARY KEY (id);


--
-- Name: group_members group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_pkey PRIMARY KEY (id);


--
-- Name: group_messages group_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: loans loans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (id);


--
-- Name: user_stats user_stats_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_key UNIQUE (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: wallet_transactions wallet_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id);


--
-- Name: idx_balances_creditor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balances_creditor_id ON public.balances USING btree (creditor_id);


--
-- Name: idx_balances_debtor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_balances_debtor_id ON public.balances USING btree (debtor_id);


--
-- Name: idx_balances_unique_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_balances_unique_group ON public.balances USING btree (debtor_id, creditor_id, group_id) WHERE (group_id IS NOT NULL);


--
-- Name: idx_balances_unique_without_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_balances_unique_without_group ON public.balances USING btree (debtor_id, creditor_id) WHERE (group_id IS NULL);


--
-- Name: idx_expense_participants_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expense_participants_user_id ON public.expense_participants USING btree (user_id);


--
-- Name: idx_expenses_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_group_id ON public.expenses USING btree (group_id);


--
-- Name: idx_expenses_paid_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_paid_by ON public.expenses USING btree (paid_by);


--
-- Name: idx_friend_requests_receiver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_friend_requests_receiver ON public.friend_requests USING btree (receiver_id);


--
-- Name: idx_friend_requests_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_friend_requests_sender ON public.friend_requests USING btree (sender_id);


--
-- Name: idx_friendships_user_one; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_friendships_user_one ON public.friendships USING btree (user_one_id);


--
-- Name: idx_friendships_user_two; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_friendships_user_two ON public.friendships USING btree (user_two_id);


--
-- Name: idx_group_members; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_members ON public.group_members USING btree (user_id, group_id);


--
-- Name: idx_group_messages_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_messages_group_id ON public.group_messages USING btree (group_id);


--
-- Name: idx_group_messages_sender_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_group_messages_sender_id ON public.group_messages USING btree (sender_id);


--
-- Name: idx_loans_borrower; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_borrower ON public.loans USING btree (borrower_id);


--
-- Name: idx_loans_lender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_loans_lender ON public.loans USING btree (lender_id);


--
-- Name: idx_payments_loan; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_payments_loan ON public.payments USING btree (loan_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_wallet_transactions_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_wallet_transactions_user_id ON public.wallet_transactions USING btree (user_id);


--
-- Name: loans trigger_overdue; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_overdue AFTER UPDATE ON public.loans FOR EACH ROW EXECUTE FUNCTION public.check_overdue_loans();


--
-- Name: balances balances_creditor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_creditor_id_fkey FOREIGN KEY (creditor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: balances balances_debtor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_debtor_id_fkey FOREIGN KEY (debtor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: balances balances_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.balances
    ADD CONSTRAINT balances_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: bans bans_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bans
    ADD CONSTRAINT bans_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: expense_participants expense_participants_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_participants
    ADD CONSTRAINT expense_participants_expense_id_fkey FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE CASCADE;


--
-- Name: expense_participants expense_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expense_participants
    ADD CONSTRAINT expense_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: expenses expenses_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: expenses expenses_paid_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES public.users(id);


--
-- Name: friend_requests friend_requests_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friend_requests friend_requests_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friend_requests
    ADD CONSTRAINT friend_requests_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_user_one_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_one_id_fkey FOREIGN KEY (user_one_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: friendships friendships_user_two_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.friendships
    ADD CONSTRAINT friendships_user_two_id_fkey FOREIGN KEY (user_two_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: group_invitations group_invitations_invited_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_invited_user_id_fkey FOREIGN KEY (invited_user_id) REFERENCES public.users(id);


--
-- Name: group_members group_members_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_members group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_members
    ADD CONSTRAINT group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_messages group_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.group_messages
    ADD CONSTRAINT group_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: loans loans_borrower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_borrower_id_fkey FOREIGN KEY (borrower_id) REFERENCES public.users(id);


--
-- Name: loans loans_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id);


--
-- Name: loans loans_lender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.loans
    ADD CONSTRAINT loans_lender_id_fkey FOREIGN KEY (lender_id) REFERENCES public.users(id);


--
-- Name: payments payments_from_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_from_user_fkey FOREIGN KEY (from_user) REFERENCES public.users(id);


--
-- Name: payments payments_loan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_loan_id_fkey FOREIGN KEY (loan_id) REFERENCES public.loans(id) ON DELETE CASCADE;


--
-- Name: payments payments_to_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_to_user_fkey FOREIGN KEY (to_user) REFERENCES public.users(id);


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: wallet_transactions wallet_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_transactions
    ADD CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict JROvsQmzObThL3bbUIBYrJ2aZT2uCKkDGHPTOT0aTtWT7LDUYlToujwkJq6QOim

