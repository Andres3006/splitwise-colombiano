--
-- PostgreSQL database dump
--

\restrict kqDO8GpImaZpv6KKLf9vyrrYXnQA3wSc0L8IhYrLdeUGzcQvj0VnuRb0xqElXsN

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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users (id, name, email, password_hash, birth_date, created_at, is_banned, credit_limit, score, role, wallet_balance) VALUES ('8309c3de-a286-4fc7-bd15-43a2229d2d8c', 'User2', 'user2@test.com', '$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6', '2000-01-01', '2026-04-11 06:12:53.037043', false, 50000.00, 100.00, 'user', 208000.00);
INSERT INTO public.users (id, name, email, password_hash, birth_date, created_at, is_banned, credit_limit, score, role, wallet_balance) VALUES ('82092a97-3a1c-477f-b104-254f6f1b0d69', 'Admin', 'admin@test.com', '$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6', '2000-01-01', '2026-04-11 06:12:53.037043', false, 50000.00, 100.00, 'user', 0.00);
INSERT INTO public.users (id, name, email, password_hash, birth_date, created_at, is_banned, credit_limit, score, role, wallet_balance) VALUES ('28accfca-f97a-4f43-96b6-1f1ca9c53198', 'User3', 'user3@test.com', '$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6', '2000-01-01', '2026-04-11 06:12:53.037043', false, 50000.00, 100.00, 'user', 0.00);
INSERT INTO public.users (id, name, email, password_hash, birth_date, created_at, is_banned, credit_limit, score, role, wallet_balance) VALUES ('cf6f0e95-a20c-40c0-8d5c-7859402a6460', 'Juan', 'juan@test.com', '$2b$10$baM7k2YoA7XyFCzNDHz14ezpffRduXU7/OG26x8kJTXRzxpQtNosa', '2000-01-01', '2026-04-11 07:09:55.346028', false, 50000.00, 100.00, 'user', 0.00);
INSERT INTO public.users (id, name, email, password_hash, birth_date, created_at, is_banned, credit_limit, score, role, wallet_balance) VALUES ('cc0585d4-4a28-4074-a7dc-fd9cfe959e15', 'edwin', 'edwin.vasquez3006@gmail.com', '$2b$10$FgnsTaugYkdXqdaRupmrJesq.xJv3tJfPLCCPGkJKmBkqSCxtMd.i', '2007-06-30', '2026-04-11 12:38:35.078707', false, 50000.00, 100.00, 'user', 0.00);
INSERT INTO public.users (id, name, email, password_hash, birth_date, created_at, is_banned, credit_limit, score, role, wallet_balance) VALUES ('f7b7d18b-38f6-435a-8cd4-92ec75b1e626', 'User1', 'user1@test.com', '$2b$10$cUHgmK6DcLQkCloncdtpO.yRZ8WTrv9FRDYh9t4L/b0Q3DkjgjvL6', '2000-01-01', '2026-04-11 06:12:53.037043', false, 50000.00, 100.00, 'user', 0.00);


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: balances; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: expense_participants; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: friend_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: friendships; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: group_invitations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: group_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: loans; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: wallet_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.wallet_transactions (id, user_id, transaction_type, amount, reference, created_at) VALUES ('c16587f7-4d65-4a7d-9b9a-37ae267b67b1', '8309c3de-a286-4fc7-bd15-43a2229d2d8c', 'deposit', 500000.00, 'Consignacion a saldo disponible', '2026-04-13 02:42:10.180565');
INSERT INTO public.wallet_transactions (id, user_id, transaction_type, amount, reference, created_at) VALUES ('a77da8f8-d652-47b2-a0cf-37064e455efc', '8309c3de-a286-4fc7-bd15-43a2229d2d8c', 'withdraw', 292000.00, 'Retiro desde saldo disponible', '2026-04-13 02:42:22.498595');


--
-- PostgreSQL database dump complete
--

\unrestrict kqDO8GpImaZpv6KKLf9vyrrYXnQA3wSc0L8IhYrLdeUGzcQvj0VnuRb0xqElXsN

