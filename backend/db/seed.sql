-- ============================================================================
-- Support Ticket Portal - Seed Data
-- Schema: mysupporttickr
-- All passwords are bcrypt hash of "password123"
-- ============================================================================

SET search_path TO mysupporttickr, public;

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

INSERT INTO mysupporttickr.organizations (id, name, plan, contact_email, created_at) VALUES
('org-1', 'Nexus Technologies', 'enterprise', 'contact@nexustech.io', '2025-03-15T00:00:00Z'),
('org-2', 'Quantum Dynamics', 'professional', 'admin@quantumdyn.com', '2025-06-01T00:00:00Z'),
('org-3', 'Arclight Studios', 'starter', 'hello@arclight.dev', '2025-09-20T00:00:00Z'),
('org-4', 'Vortex Solutions', 'professional', 'support@vortexsol.com', '2025-11-10T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- USERS
-- password_hash = bcrypt("password123") = $2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa
-- ============================================================================

INSERT INTO mysupporttickr.users (id, name, email, password_hash, role, organization_id, avatar, created_at) VALUES
-- Internal users (no org)
('user-1',  'Admin User',    'admin@supportdesk.io',    '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'admin',         NULL,    'AU', NOW()),
('user-2',  'Sarah Chen',    'sarah@supportdesk.io',    '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'support-lead',  NULL,    'SC', NOW()),
('user-3',  'Marcus Webb',   'marcus@supportdesk.io',   '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'support-staff', NULL,    'MW', NOW()),
('user-4',  'Elena Voss',    'elena@supportdesk.io',    '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'support-staff', NULL,    'EV', NOW()),
-- Nexus Technologies
('user-5',  'James Park',    'james@nexustech.io',      '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'client',        'org-1', 'JP', NOW()),
('user-6',  'Ava Mitchell',  'ava@nexustech.io',        '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'client',        'org-1', 'AM', NOW()),
-- Quantum Dynamics
('user-7',  'Ryan Torres',   'ryan@quantumdyn.com',     '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'client',        'org-2', 'RT', NOW()),
('user-8',  'Lena Kim',      'lena@quantumdyn.com',     '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'client',        'org-2', 'LK', NOW()),
-- Arclight Studios
('user-9',  'Derek Hale',    'derek@arclight.dev',      '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'client',        'org-3', 'DH', NOW()),
-- Vortex Solutions
('user-10', 'Nina Patel',    'nina@vortexsol.com',      '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'client',        'org-4', 'NP', NOW()),
('user-11', 'Oliver Grant',  'oliver@vortexsol.com',    '$2a$10$rQEY0tKMmRhSIxMpKsN2OeYHUYNhZxJcWFSgj6wXlLhOqIGxT3FPa', 'client',        'org-4', 'OG', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TICKETS
-- ============================================================================

INSERT INTO mysupporttickr.tickets (id, title, description, status, priority, category, organization_id, created_by, assigned_to, hours_worked, created_at, updated_at) VALUES
('TKT-001', 'Login page returns 500 error on mobile',
 'When trying to log in from a mobile browser (Chrome on Android), the login page throws a 500 internal server error. This started after the last deployment on Friday.',
 'in-progress', 'critical', 'bug', 'org-1', 'user-5', 'user-3', 4.5,
 '2026-02-01T10:30:00Z', '2026-02-10T14:15:00Z'),

('TKT-002', 'Dashboard charts not loading for admin users',
 'Admin role users see a blank white area where the analytics charts should appear. Regular users can see them fine.',
 'open', 'high', 'bug', 'org-1', 'user-6', 'user-4', 0,
 '2026-02-05T08:45:00Z', '2026-02-05T08:45:00Z'),

('TKT-003', 'How to configure SSO with SAML?',
 'We need to set up SAML-based SSO for our organization. Can you provide documentation or guide us through the process?',
 'awaiting-client', 'medium', 'question', 'org-2', 'user-7', 'user-3', 2,
 '2026-01-28T13:00:00Z', '2026-02-08T16:30:00Z'),

('TKT-004', 'API rate limiting is too aggressive',
 'Our integration is hitting the rate limit after only 50 requests per minute. We need at least 200 rpm for our workflow automation.',
 'resolved', 'high', 'support', 'org-2', 'user-8', 'user-4', 3,
 '2026-01-15T11:20:00Z', '2026-02-01T09:00:00Z'),

('TKT-005', 'Export feature crashes with large datasets',
 'When exporting more than 10,000 records to CSV, the application crashes with an out of memory error.',
 'in-progress', 'high', 'bug', 'org-3', 'user-9', 'user-3', 6,
 '2026-02-08T07:15:00Z', '2026-02-12T11:00:00Z'),

('TKT-006', 'Request: Dark mode support',
 'Many of our team members work late hours and have requested dark mode support for the application.',
 'open', 'low', 'support', 'org-1', 'user-5', NULL, 0,
 '2026-02-10T16:00:00Z', '2026-02-10T16:00:00Z'),

('TKT-007', 'Webhook delivery failures',
 'Our webhook endpoint is receiving duplicate events and some events are missing entirely.',
 'in-progress', 'critical', 'bug', 'org-4', 'user-10', 'user-4', 5,
 '2026-02-11T09:30:00Z', '2026-02-13T08:00:00Z'),

('TKT-008', 'Need help with bulk user import',
 'We have 500+ users to import from our old system. Is there a bulk import tool or API endpoint?',
 'resolved', 'medium', 'question', 'org-4', 'user-11', 'user-3', 4,
 '2026-01-20T10:00:00Z', '2026-01-25T15:30:00Z'),

('TKT-009', 'Slow page load times on report generation',
 'The monthly reports page takes over 30 seconds to load. This is impacting our ability to generate timely reports.',
 'open', 'medium', 'bug', 'org-2', 'user-7', NULL, 0,
 '2026-02-12T14:00:00Z', '2026-02-12T14:00:00Z'),

('TKT-010', 'Email notifications not being delivered',
 'Users are not receiving any email notifications for ticket updates or assignments.',
 'closed', 'high', 'bug', 'org-3', 'user-9', 'user-4', 6,
 '2026-01-05T08:00:00Z', '2026-01-12T16:00:00Z'),

('TKT-011', 'Add multi-language support',
 'We need the application to support Japanese and Korean for our APAC teams.',
 'open', 'medium', 'support', 'org-1', 'user-6', NULL, 0,
 '2026-02-13T06:00:00Z', '2026-02-13T06:00:00Z'),

('TKT-012', 'Permission error when accessing team settings',
 'Getting a 403 Forbidden error when trying to modify team settings as an org admin.',
 'resolved', 'high', 'bug', 'org-4', 'user-10', 'user-3', 3.5,
 '2026-01-28T09:00:00Z', '2026-02-03T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MESSAGES
-- ============================================================================

INSERT INTO mysupporttickr.messages (id, ticket_id, user_id, content, is_internal, created_at) VALUES
-- TKT-001
('msg-1',  'TKT-001', 'user-5', 'This is blocking our entire mobile team from accessing the platform. We need this fixed ASAP.', false, '2026-02-01T10:30:00Z'),
('msg-2',  'TKT-001', 'user-3', 'I''ve reproduced the issue. It appears to be related to the session token handling on mobile user agents. Working on a fix now.', false, '2026-02-02T09:00:00Z'),
('msg-3',  'TKT-001', 'user-3', 'Root cause found: the mobile UA string is being truncated in the session middleware, causing a null reference. Fix is in testing.', true, '2026-02-10T14:15:00Z'),
-- TKT-002
('msg-4',  'TKT-002', 'user-6', 'I''ve attached a screenshot. The chart container is rendered but no data is displayed for admin users.', false, '2026-02-05T08:45:00Z'),
-- TKT-003
('msg-5',  'TKT-003', 'user-7', 'We are migrating to Okta and need SAML SSO configured. Can you help?', false, '2026-01-28T13:00:00Z'),
('msg-6',  'TKT-003', 'user-3', 'Absolutely! I''ve sent over the SAML configuration guide. You will need to provide your Okta metadata URL and entity ID. Could you share those?', false, '2026-01-29T10:00:00Z'),
-- TKT-004
('msg-7',  'TKT-004', 'user-8', 'We keep getting 429 errors during peak hours. Our automation breaks when this happens.', false, '2026-01-15T11:20:00Z'),
('msg-8',  'TKT-004', 'user-4', 'I''ve increased your rate limit to 250 rpm based on your Professional plan tier. Let us know if you still experience issues.', false, '2026-01-20T15:45:00Z'),
('msg-9',  'TKT-004', 'user-8', 'That fixed it! Thank you for the quick resolution.', false, '2026-02-01T09:00:00Z'),
-- TKT-005
('msg-10', 'TKT-005', 'user-9', 'Consistently crashes when trying to export our full client list. Smaller exports work fine.', false, '2026-02-08T07:15:00Z'),
('msg-11', 'TKT-005', 'user-3', 'Looking into streaming the export instead of loading everything into memory. This should handle any dataset size.', false, '2026-02-10T09:30:00Z'),
-- TKT-006
('msg-12', 'TKT-006', 'user-5', 'Would love to see a dark mode option. It would help our developers who work on the platform during night shifts.', false, '2026-02-10T16:00:00Z'),
-- TKT-007
('msg-13', 'TKT-007', 'user-10', 'We are seeing duplicate order.completed events and missing payment.failed events in our webhook logs.', false, '2026-02-11T09:30:00Z'),
('msg-14', 'TKT-007', 'user-4', 'We''ve identified a race condition in the webhook queue processor. Working on the fix.', false, '2026-02-12T14:00:00Z'),
('msg-15', 'TKT-007', 'user-4', 'The idempotency key implementation has a bug where it doesn''t properly deduplicate within the retry window.', true, '2026-02-12T14:00:00Z'),
-- TKT-008
('msg-16', 'TKT-008', 'user-11', 'Do you have a CSV import feature or should we use the API?', false, '2026-01-20T10:00:00Z'),
('msg-17', 'TKT-008', 'user-3', 'We have a bulk import API endpoint. I''ll send you the documentation and a sample script.', false, '2026-01-21T11:00:00Z'),
('msg-18', 'TKT-008', 'user-11', 'Perfect, the script worked great. All 500 users imported successfully!', false, '2026-01-25T15:30:00Z'),
-- TKT-009
('msg-19', 'TKT-009', 'user-7', 'The reports page has been getting slower over the past two weeks. It''s now over 30 seconds on average.', false, '2026-02-12T14:00:00Z'),
-- TKT-010
('msg-20', 'TKT-010', 'user-9', 'None of our team is getting email notifications. Checked spam folders too.', false, '2026-01-05T08:00:00Z'),
('msg-21', 'TKT-010', 'user-4', 'Found the issue - the email service API key had expired. Renewed it and all notifications should be flowing now.', false, '2026-01-10T11:30:00Z'),
('msg-22', 'TKT-010', 'user-9', 'Confirmed - we are receiving emails again. Thanks!', false, '2026-01-12T16:00:00Z'),
-- TKT-011
('msg-23', 'TKT-011', 'user-6', 'Our Tokyo and Seoul offices need localized versions of the app. Is this on the roadmap?', false, '2026-02-13T06:00:00Z'),
-- TKT-012
('msg-24', 'TKT-012', 'user-10', 'I''m the org admin but I get a 403 error when trying to change team settings.', false, '2026-01-28T09:00:00Z'),
('msg-25', 'TKT-012', 'user-3', 'Fixed! There was a permission mapping issue for org admin roles. It''s been corrected.', false, '2026-02-03T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- TIME ENTRIES
-- ============================================================================

INSERT INTO mysupporttickr.time_entries (id, ticket_id, user_id, hours, description, entry_date, created_at) VALUES
('te-1',  'TKT-001', 'user-3', 2.0,  'Initial investigation and reproduction', '2026-02-02', '2026-02-02T10:00:00Z'),
('te-2',  'TKT-001', 'user-3', 2.5,  'Root cause analysis and fix development', '2026-02-10', '2026-02-10T15:00:00Z'),
('te-3',  'TKT-003', 'user-3', 2.0,  'Prepared SSO documentation and configuration guide', '2026-01-29', '2026-01-29T11:00:00Z'),
('te-4',  'TKT-004', 'user-4', 1.0,  'Investigated rate limit configuration', '2026-01-18', '2026-01-18T10:00:00Z'),
('te-5',  'TKT-004', 'user-4', 2.0,  'Updated rate limit rules and monitoring', '2026-01-20', '2026-01-20T16:00:00Z'),
('te-6',  'TKT-005', 'user-3', 3.0,  'Profiled memory usage during export', '2026-02-09', '2026-02-09T10:00:00Z'),
('te-7',  'TKT-005', 'user-3', 3.0,  'Implementing streaming export approach', '2026-02-12', '2026-02-12T12:00:00Z'),
('te-8',  'TKT-007', 'user-4', 2.5,  'Analyzed webhook logs and identified duplication pattern', '2026-02-11', '2026-02-11T10:00:00Z'),
('te-9',  'TKT-007', 'user-4', 2.5,  'Debugging idempotency key implementation', '2026-02-12', '2026-02-12T15:00:00Z'),
('te-10', 'TKT-008', 'user-3', 4.0,  'Prepared documentation and import script for client', '2026-01-21', '2026-01-21T12:00:00Z'),
('te-11', 'TKT-010', 'user-4', 3.0,  'Diagnosed email delivery pipeline', '2026-01-08', '2026-01-08T10:00:00Z'),
('te-12', 'TKT-010', 'user-4', 3.0,  'Renewed API keys and tested delivery', '2026-01-10', '2026-01-10T12:00:00Z'),
('te-13', 'TKT-012', 'user-3', 3.5,  'Investigated and fixed permission mapping for org admin role', '2026-02-02', '2026-02-02T13:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- CONVERSION REQUESTS
-- ============================================================================

INSERT INTO mysupporttickr.conversion_requests (id, ticket_id, proposed_type, reason, internal_approval, client_approval, proposed_by, created_at) VALUES
('cr-1', 'TKT-005', 'enhancement',
 'The export system needs a fundamental redesign to support streaming. This goes beyond a bug fix and should be treated as an enhancement to improve overall export performance and reliability.',
 'approved', 'pending', 'user-3', '2026-02-12T11:00:00Z'),
('cr-2', 'TKT-006', 'feature',
 'This is a feature request rather than a support issue. Dark mode would require implementing a theming system across the entire application.',
 'pending', 'pending', 'user-2', '2026-02-11T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- INVOICES
-- ============================================================================

INSERT INTO mysupporttickr.invoices (id, organization_id, month, year, tickets_closed, total_hours, rate_per_hour, total_amount, status, created_at) VALUES
('INV-2026-001', 'org-1', 1, 2026, 3, 12.0,  150, 1800.00, 'paid', '2026-02-01T00:00:00Z'),
('INV-2026-002', 'org-2', 1, 2026, 2, 8.0,   150, 1200.00, 'sent', '2026-02-01T00:00:00Z'),
('INV-2026-003', 'org-3', 1, 2026, 1, 6.0,   150,  900.00, 'paid', '2026-02-01T00:00:00Z'),
('INV-2026-004', 'org-4', 1, 2026, 2, 7.5,   150, 1125.00, 'sent', '2026-02-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ACTIVITIES
-- ============================================================================

INSERT INTO mysupporttickr.activities (id, type, description, user_id, ticket_id, created_at) VALUES
('act-1', 'ticket-created',        'New ticket: Add multi-language support',                                   'user-6', 'TKT-011', '2026-02-13T06:00:00Z'),
('act-2', 'ticket-updated',        'Ticket TKT-007 updated: Webhook delivery failures',                       'user-4', 'TKT-007', '2026-02-13T08:00:00Z'),
('act-3', 'ticket-created',        'New ticket: Slow page load times on report generation',                    'user-7', 'TKT-009', '2026-02-12T14:00:00Z'),
('act-4', 'conversion-requested',  'Conversion requested: Export feature crashes with large datasets',         'user-3', 'TKT-005', '2026-02-12T11:00:00Z'),
('act-5', 'message-added',         'New message on TKT-005 from Marcus Webb',                                  'user-3', 'TKT-005', '2026-02-10T09:30:00Z'),
('act-6', 'ticket-resolved',       'Ticket resolved: API rate limiting is too aggressive',                     'user-4', 'TKT-004', '2026-02-01T09:00:00Z'),
('act-7', 'ticket-resolved',       'Ticket resolved: Permission error when accessing team settings',           'user-3', 'TKT-012', '2026-02-03T12:00:00Z'),
('act-8', 'conversion-approved',   'Internal approval granted for TKT-005 enhancement conversion',            'user-2', 'TKT-005', '2026-02-12T15:00:00Z')
ON CONFLICT (id) DO NOTHING;
