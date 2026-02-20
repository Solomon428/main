--
-- PostgreSQL database dump
--

\restrict zVJCByeKM2FzVjzZI8Xe4CDokYqsKr9ZkHgWHZHfTuIJH61q4cYQlnyyXBZbU4L

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
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

INSERT INTO public.organizations VALUES ('org_default', 'CreditorFlow Demo Company', NULL, NULL, '1234567890', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'South Africa', 'ZA', 'Africa/Johannesburg', 'ZAR', 'ZAR', '{ZAR}', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, false, false, NULL, 'BASIC', NULL, 10, 1000, 1073741824, 0, NULL, NULL, '2026-02-17 00:44:48.128', '2026-02-17 00:44:48.128', NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

INSERT INTO public.users VALUES ('cmlpvsfj50001mu7ofwi458de', NULL, 'admin@creditorflow.com', NULL, 'System Administrator', NULL, NULL, NULL, '$2b$10$ZKg6Kfda48f42taoC9Crf.rwm4hnwCR4WAL6X.Kc2GqaCJd2zlA42', 'ADMIN', NULL, NULL, NULL, NULL, NULL, 'Africa/Johannesburg', 'en', 'en-ZA', true, false, NULL, NULL, 5, '2026-02-19 09:01:23.271', NULL, NULL, false, NULL, NULL, NULL, true, false, true, NULL, 'light', false, NULL, 30, '2026-02-17 00:44:48.161', '2026-02-19 08:31:23.275', NULL, 'org_default');


--
-- Data for Name: _OrganizationMembers; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

INSERT INTO public.suppliers VALUES ('cmlpvsfjp0003mu7odlij2nhw', 'org_default', NULL, 'Acme Supplies Ltd', NULL, NULL, '9876543210', NULL, NULL, NULL, 'PENDING_VERIFICATION', 'SERVICES', NULL, NULL, 'MEDIUM', 0.00, 'COMPLIANT', NULL, NULL, 'accounts@acmesupplies.com', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'South Africa', 'ZA', NULL, NULL, NULL, NULL, NULL, NULL, 'CURRENT', NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, NULL, 'ZAR', 0, 0, 0.00, 0.00, 0.00, NULL, NULL, NULL, NULL, true, false, false, false, false, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-17 00:44:48.18', '2026-02-17 00:44:48.18', NULL);


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: _SupplierTags; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: approval_chains; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: creditorflow
--

INSERT INTO public.invoices VALUES ('cmlpvsfke0005mu7omq47dgrl', 'org_default', 'INV-2024-001', 'cmlpvsfjp0003mu7odlij2nhw', 'cmlpvsfj50001mu7ofwi458de', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-17 00:44:48.201', '2026-03-19 00:44:48.201', '2026-02-17 00:44:48.206', NULL, NULL, NULL, NULL, NULL, NULL, 13043.48, NULL, 15.00, 1956.52, 15000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'ZAR', 1.000000, 'ZAR', NULL, 'PENDING_APPROVAL', 'UNPAID', 'PENDING', 'LOW', NULL, NULL, NULL, NULL, false, NULL, 'ON_TRACK', NULL, NULL, NULL, 'Acme Supplies Ltd', NULL, NULL, NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, false, NULL, NULL, NULL, NULL, false, false, false, NULL, false, NULL, NULL, NULL, false, false, false, false, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'MANUAL', NULL, NULL, NULL, '2026-02-17 00:44:48.206', '2026-02-17 00:44:48.206', NULL);
INSERT INTO public.invoices VALUES ('cmlpvsfl20007mu7oyk9rhesi', 'org_default', 'INV-2024-002', 'cmlpvsfjp0003mu7odlij2nhw', 'cmlpvsfj50001mu7ofwi458de', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-12 00:44:48.201', '2026-03-04 00:44:48.201', '2026-02-17 00:44:48.23', NULL, NULL, NULL, NULL, NULL, NULL, 7391.74, NULL, 15.00, 1108.76, 8500.50, 0.00, 0.00, 0.00, 0.00, 0.00, 'ZAR', 1.000000, 'ZAR', NULL, 'APPROVED', 'SCHEDULED', 'APPROVED', 'LOW', NULL, NULL, NULL, NULL, false, NULL, 'ON_TRACK', NULL, NULL, NULL, 'Acme Supplies Ltd', NULL, NULL, NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, false, NULL, NULL, NULL, NULL, true, false, false, NULL, false, NULL, NULL, NULL, false, false, false, false, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'MANUAL', NULL, NULL, NULL, '2026-02-17 00:44:48.23', '2026-02-17 00:44:48.23', NULL);
INSERT INTO public.invoices VALUES ('cmlpvsfl90009mu7ob0twxwa5', 'org_default', 'INV-2024-003', 'cmlpvsfjp0003mu7odlij2nhw', 'cmlpvsfj50001mu7ofwi458de', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-03 00:44:48.201', '2026-02-07 00:44:48.201', '2026-02-17 00:44:48.237', NULL, NULL, NULL, NULL, NULL, NULL, 2782.61, NULL, 15.00, 417.39, 3200.00, 0.00, 0.00, 0.00, 0.00, 0.00, 'ZAR', 1.000000, 'ZAR', NULL, 'PAID', 'PAID', 'APPROVED', 'LOW', NULL, NULL, NULL, NULL, false, NULL, 'ON_TRACK', NULL, NULL, NULL, 'Acme Supplies Ltd', NULL, NULL, NULL, NULL, NULL, NULL, 30, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0.00, 0.00, false, NULL, NULL, NULL, NULL, false, false, false, NULL, false, NULL, NULL, NULL, false, false, false, false, NULL, NULL, 1, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'MANUAL', NULL, NULL, NULL, '2026-02-17 00:44:48.237', '2026-02-17 00:44:48.237', NULL);


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: bank_accounts; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: compliance_checks; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: custom_fields; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: delegated_approvals; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: file_attachments; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: integrations; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: integration_sync_logs; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: invoice_activities; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: invoice_comments; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: invoice_line_items; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: payment_batches; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: reconciliations; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: reconciliation_items; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: risk_scores; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: scheduled_tasks; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: supplier_bank_accounts; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: supplier_contacts; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: supplier_contracts; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: supplier_performance; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: verification_tokens; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: creditorflow
--



--
-- PostgreSQL database dump complete
--

\unrestrict zVJCByeKM2FzVjzZI8Xe4CDokYqsKr9ZkHgWHZHfTuIJH61q4cYQlnyyXBZbU4L

