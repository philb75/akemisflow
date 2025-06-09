-- Sample data for AkemisFlow development
-- This matches the mock data structure used in the UI

-- Insert Akemis Partners
INSERT INTO contacts (id, contact_type, name, email, phone, address_line1, address_line2, city, country, currency_preference, profit_share_percentage, notes) VALUES
('11111111-1111-1111-1111-111111111111', 'PARTNER', 'Philippe Barthelemy', 'philippe@akemis.com', '+33 6 12 34 56 78', 'Unit 905-906, 9th Floor', '30 Canton Road, Tsim Sha Tsui', 'Hong Kong', 'HK', 'EUR', 50.00, 'Founder and Managing Partner'),
('11111111-1111-1111-1111-111111111112', 'PARTNER', 'Partner Two', 'partner2@akemis.com', NULL, NULL, NULL, NULL, NULL, 'EUR', 30.00, 'Investment Partner'),
('11111111-1111-1111-1111-111111111113', 'PARTNER', 'Partner Three', 'partner3@akemis.com', NULL, NULL, NULL, NULL, NULL, 'EUR', 20.00, 'Strategic Partner')
ON CONFLICT (id) DO NOTHING;

-- Insert Client Companies
INSERT INTO contacts (id, contact_type, name, email, phone, address_line1, city, postal_code, country, currency_preference, tax_id, notes) VALUES
('22222222-2222-2222-2222-222222222221', 'CLIENT_COMPANY', 'OpenIT Consulting', 'contact@openit.fr', '+33 1 42 34 56 78', '45 Avenue des Champs-Élysées', 'Paris', '75008', 'FR', 'EUR', 'FR12345678901', 'French IT consulting firm - PHP development projects'),
('22222222-2222-2222-2222-222222222222', 'CLIENT_COMPANY', 'TechCorp Ltd', 'contact@techcorp.com', '+44 20 7123 4567', '123 Tech Street', 'London', NULL, 'GB', 'GBP', 'GB123456789', 'Technology consulting client'),
('22222222-2222-2222-2222-222222222223', 'CLIENT_COMPANY', 'Global Solutions Inc', 'info@globalsolutions.com', '+1 555 123 4567', '789 Business Ave', 'New York', '10001', 'US', 'USD', 'US987654321', 'Enterprise software solutions')
ON CONFLICT (id) DO NOTHING;

-- Insert Client Contacts
INSERT INTO contacts (id, contact_type, name, email, phone, parent_company_id, currency_preference, notes) VALUES
('33333333-3333-3333-3333-333333333331', 'CLIENT_CONTACT', 'Chihab Abdelillah', 'chihab@openit.fr', '+33 6 78 90 12 34', '22222222-2222-2222-2222-222222222221', 'EUR', 'Technical Lead at OpenIT Consulting'),
('33333333-3333-3333-3333-333333333332', 'CLIENT_CONTACT', 'John Smith', 'john@techcorp.com', '+44 7700 900123', '22222222-2222-2222-2222-222222222222', 'GBP', 'Project Manager at TechCorp')
ON CONFLICT (id) DO NOTHING;

-- Insert Consultants
INSERT INTO contacts (id, contact_type, name, email, phone, address_line1, city, postal_code, country, currency_preference, notes) VALUES
('44444444-4444-4444-4444-444444444441', 'CONSULTANT', 'Marie Dubois', 'marie.dubois@freelance.fr', '+33 6 98 76 54 32', '12 Rue de la Paix', 'Lyon', '69000', 'FR', 'EUR', 'Senior PHP Developer - 8 years experience'),
('44444444-4444-4444-4444-444444444442', 'CONSULTANT', 'Ahmed Hassan', 'ahmed.hassan@techexpert.com', '+971 50 123 4567', NULL, 'Dubai', NULL, 'AE', 'USD', 'Full-stack developer with React/Node.js expertise')
ON CONFLICT (id) DO NOTHING;

-- Insert Bank Accounts
INSERT INTO bank_accounts (id, account_name, bank_name, account_number, currency, iban, swift_bic, account_type, status, contact_id, airwallex_account_id, daily_limit, monthly_limit) VALUES
('55555555-5555-5555-5555-555555555551', 'Akemis EUR Operations', 'Airwallex', 'AWX-EUR-001', 'EUR', 'GB29NWBK60161331926819', 'NWBKGB2L', 'BUSINESS', 'ACTIVE', '11111111-1111-1111-1111-111111111111', 'awx_eur_main_001', 50000.00, 1000000.00),
('55555555-5555-5555-5555-555555555552', 'Akemis USD Operations', 'Airwallex', 'AWX-USD-001', 'USD', 'GB76NWBK60161331926820', 'NWBKGB2L', 'BUSINESS', 'ACTIVE', '11111111-1111-1111-1111-111111111111', 'awx_usd_main_001', 60000.00, 1200000.00),
('55555555-5555-5555-5555-555555555553', 'Akemis Hong Kong Operations', 'HSBC Hong Kong', 'HSBC-HK-001', 'HKD', NULL, NULL, 'BUSINESS', 'ACTIVE', '11111111-1111-1111-1111-111111111111', NULL, 400000.00, 8000000.00)
ON CONFLICT (id) DO NOTHING;

-- Insert Exchange Rates
INSERT INTO exchange_rates (from_currency, to_currency, rate, bid_rate, ask_rate, spread, rate_date) VALUES
('USD', 'EUR', 0.92, 0.9191, 0.9209, 0.0018, CURRENT_DATE),
('EUR', 'USD', 1.09, 1.0882, 1.0918, 0.0036, CURRENT_DATE),
('GBP', 'EUR', 1.17, 1.1683, 1.1717, 0.0034, CURRENT_DATE),
('EUR', 'GBP', 0.85, 0.8485, 0.8515, 0.0030, CURRENT_DATE),
('USD', 'GBP', 0.79, 0.7884, 0.7916, 0.0032, CURRENT_DATE),
('GBP', 'USD', 1.27, 1.2673, 1.2727, 0.0054, CURRENT_DATE),
('HKD', 'EUR', 0.12, 0.1199, 0.1201, 0.0002, CURRENT_DATE),
('EUR', 'HKD', 8.50, 8.4915, 8.5085, 0.0170, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, rate_date) DO NOTHING;

-- Insert Sample Transactions
INSERT INTO transactions (id, bank_account_id, transaction_type, amount, currency, description, reference_number, category, counterparty_contact_id, transaction_date, source, airwallex_transaction_id) VALUES
('66666666-6666-6666-6666-666666666661', '55555555-5555-5555-5555-555555555551', 'CREDIT', 4779.93, 'EUR', 'Payment from OpenIT Consulting - Invoice INV-2025043045', 'INV-2025043045', 'INVOICE_PAYMENT', '22222222-2222-2222-2222-222222222221', '2025-06-01', 'AIRWALLEX', 'awx_txn_001'),
('66666666-6666-6666-6666-666666666662', '55555555-5555-5555-5555-555555555552', 'CREDIT', 15000.00, 'USD', 'Payment from Global Solutions Inc - Project milestone', 'GS-2025-Q2-001', 'INVOICE_PAYMENT', '22222222-2222-2222-2222-222222222223', '2025-06-05', 'AIRWALLEX', 'awx_txn_002'),
('66666666-6666-6666-6666-666666666663', '55555555-5555-5555-5555-555555555551', 'DEBIT', 3600.00, 'EUR', 'Consultant payment - Marie Dubois', 'CONSULTANT-001', 'CONSULTANT_PAYMENT', '44444444-4444-4444-4444-444444444441', '2025-06-02', 'MANUAL', NULL),
('66666666-6666-6666-6666-666666666664', '55555555-5555-5555-5555-555555555551', 'DEBIT', 25.00, 'EUR', 'Bank fees - International transfer', 'FEE-001', 'FEE', NULL, '2025-06-03', 'AIRWALLEX', 'awx_fee_001')
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Invoices
INSERT INTO invoices (id, invoice_number, display_number, client_contact_id, amount, currency, subtotal, total_tax, total_amount, status, issue_date, due_date, sent_date, paid_date, bank_account_id, payment_terms_text, project_name, reference_number, line_items, payment_transaction_id) VALUES
('77777777-7777-7777-7777-777777777771', 'INV-2025043045', '2025043045', '33333333-3333-3333-3333-333333333331', 4779.93, 'EUR', 4779.93, 0.00, 4779.93, 'PAID', '2025-05-30', '2025-05-30', '2025-05-30', '2025-06-01', '55555555-5555-5555-5555-555555555551', 'Due Upon Receipt', 'Tech LEAD PHP Development', 'OPENIT-2025-Q2', '[{"lineNumber": 1, "description": "Tech LEAD PHP Development", "quantity": 9.10, "unit": "hours", "unitPrice": 525.00, "lineTotal": 4779.93, "taxRate": 0.00, "taxAmount": 0.00}]', '66666666-6666-6666-6666-666666666661'),
('77777777-7777-7777-7777-777777777772', 'INV-2025043046', '2025043046', '33333333-3333-3333-3333-333333333332', 8500.00, 'GBP', 8500.00, 0.00, 8500.00, 'SENT', '2025-06-05', '2025-06-15', '2025-06-05', NULL, '55555555-5555-5555-5555-555555555551', 'Net 10 days', 'React Development Project', 'TECHCORP-2025-Q2', '[{"lineNumber": 1, "description": "React Frontend Development", "quantity": 40, "unit": "hours", "unitPrice": 212.50, "lineTotal": 8500.00, "taxRate": 0.00, "taxAmount": 0.00}]', NULL),
('77777777-7777-7777-7777-777777777773', 'INV-2025043047', '2025043047', '22222222-2222-2222-2222-222222222223', 15000.00, 'USD', 15000.00, 0.00, 15000.00, 'DRAFT', '2025-06-08', '2025-06-22', NULL, NULL, '55555555-5555-5555-5555-555555555552', 'Net 14 days', 'Enterprise Integration', 'GLOBAL-2025-Q2', '[{"lineNumber": 1, "description": "Enterprise System Integration", "quantity": 60, "unit": "hours", "unitPrice": 250.00, "lineTotal": 15000.00, "taxRate": 0.00, "taxAmount": 0.00}]', NULL)
ON CONFLICT (id) DO NOTHING;

-- Insert Sample Consultant Payments
INSERT INTO consultant_payments (id, consultant_contact_id, related_invoice_id, amount, currency, net_amount, commission_rate, status, payment_method, payment_date, description, payment_transaction_id) VALUES
('88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444441', '77777777-7777-7777-7777-777777777771', 3600.00, 'EUR', 3600.00, 75.00, 'PAID', 'BANK_TRANSFER', '2025-06-02', 'Payment for Tech LEAD PHP Development - 9.10 hours', '66666666-6666-6666-6666-666666666663')
ON CONFLICT (id) DO NOTHING;