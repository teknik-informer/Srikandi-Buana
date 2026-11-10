# SRIKANDI BUANA v13 — Domain Data Dictionary

This is a target relational model, not an executable SQL migration. The actual agreement forms, the local agriculture office, privacy rules and supply-chain flows must be reviewed before any schema is applied.

## Shared conventions

- Every organisation-owned business table must carry organisation_id and audit metadata: created_at, created_by, updated_at, updated_by and version where appropriate.
- Enforce organisation ownership in composite foreign keys and scoped queries. Never trust an organisation ID supplied by a browser.
- Store timestamps in UTC and render local time in the user's configured timezone.
- Use decimal/numeric types for money and quantity; do not store money or weights in floating-point columns.
- Store currency as ISO 4217 code; store quantity unit and product form explicitly.
- NULL means unknown/not recorded. A numeric zero means measured zero. Never default unknown measures to zero.
- Important corrections must preserve the prior value, reason, actor, reviewer and timestamp.
- Private evidence is never served from public-media URLs.

## 1. Organisation and legal identity

### organisations
Primary group/workspace identity.

Fields: id, display_name, organisation_type, operating_name, operational_status, country_code, province_code, district_code, subdistrict_code, village_code, address, primary_contact_id, current_governance_period_id.

Organisation type is the actually recorded form, such as KWT, Poktan, Gapoktan, association, cooperative or business entity. Operational status and legal-entity status are separate.

### organisation_units
Subgroups, branches, committees, field teams and functional units.

Fields: id, organisation_id, parent_unit_id, unit_type, name, location_id, active_from, active_to, status.

### legal_registrations
A separate record for every issuing authority or scheme.

Fields: id, organisation_id, registration_type, issuing_authority, reference_number, holder_name, scope_description, issued_on, expires_on, status, source_document_id, verified_by, verified_at, external_verification_reference.

Examples: SIMLUHTAN farmer institution, AHU association/cooperative decree, NIB/OSS, NPWP, bank reference, partner-specific code and certification holder ID. Do not collapse these into one generic registration number.

### governance_periods, officers, officer_appointments and governance_decisions
Track member mandate, election/appointment period, duties, delegated authorities, assembly decisions, approval thresholds, meeting quorum, effective dates, linked minutes and resulting tasks.

## 2. People, memberships and beneficiaries

### people
A person identity is independent from their status as member, program participant or producer.

Fields: id, organisation_id or a protected shared-person identity strategy, display_name, preferred_name, birth_year where sufficient, contact_preferences, language, identity_reference_token, privacy_class, status.

Avoid copying national identity numbers into common member tables. Where a specific program legally requires them, store encrypted and restricted fields with purpose, retention and access policy. Deduplication creates a human review queue; it never merges identities automatically.

### memberships
Fields: id, organisation_id, person_id, member_number, joined_on, ended_on, membership_status, membership_category, admission_decision_id, source_document_id.

A withdrawn or suspended membership remains in history.

### consent_records
Fields: id, organisation_id, person_id, program_id nullable, purpose_code, notice_version, lawful_basis, decision, consented_at, withdrawn_at, scope, recipient_categories, retention_rule_id, captured_by, evidence_id.

Use separate purpose codes for member administration, program delivery, partner sharing, farm mapping, photo/media publication, communications and research/evaluation where appropriate. Consent is not assumed from membership.

### beneficiary_enrolments
Fields: id, organisation_id, program_id, person_id, eligibility_rule_version, eligibility_result, eligibility_reason, decision_actor_id, decision_at, appeal_status, enrolled_at, exited_at, exit_reason, source_record_id.

A person may have multiple program enrolments. Eligibility is determined separately for each program; membership alone does not prove eligibility.

### service_deliveries and attendance
A service delivery represents one actual benefit, training, input, advisory or service event. Attendance is a separate person-level relation.

Service delivery fields: id, program_id, service_type, activity_id, service_date, delivery_location, quantity, unit, provider_id, evidence_id, verification_state.
Attendance fields: delivery_id, person_id, attendance_state, recorded_at, verified_by, evidence_id.

Prevent counting the same participant twice in one indicator period unless the indicator explicitly measures repeated services.

## 3. Producers, farms and plots

### producer_profiles
Fields: id, organisation_id, person_id, producer_code, producer_status, primary_commodity, first_supply_date, last_supply_date, verification_state.

Producer status is separate from membership status.

### farms
Fields: id, organisation_id, farm_code, farm_name, location_id, producer_relationship_type, tenure_status, tenure_evidence_id, farm_size_reported, farm_size_verified, area_unit, verification_state.

A farm may relate to multiple people when that relationship is documented. Do not infer land ownership from farming activity.

### plots
Fields: id, organisation_id, farm_id, plot_code, commodity_code, area_reported, area_verified, area_unit, map_status, mapping_method, mapped_at, mapped_by, coordinate_accuracy_m, boundary_version_id, tenure_review_state.

### plot_boundary_versions
Fields: id, organisation_id, plot_id, geometry_private, centroid_private, coordinate_reference_system, area_calculated, map_source, captured_at, verified_by, verified_at, supersedes_id.

Geometry is access-controlled. Partners receive only the approved level of location precision. Private plot boundaries are never exposed in public maps.

### farm_seasons, farm_diary_entries, farm_inputs, farm_practices and harvest_records
Use separate events for planting, agroforestry, input use, training, harvest, pest observations and measured yield. Measurements store value, unit, collection method, instrument/scale ID where relevant, observed_at, source and verification. Keep estimates separate from measured actuals.

## 4. Partners, programs and MEAL

### partners
Fields: id, organisation_id, partner_type, legal_name, country_code, official_website, contact_record_id, due_diligence_status, approved_scope, risk_rating, reviewed_at, next_review_at.

Partner due diligence is separate from the status of a funded program.

### opportunities
Fields: id, partner_id, name, source, stage, received_at, decision_deadline, proposed_scope, owner_id, next_action, decline_reason.

Stages distinguish identified, contacted, invited, proposal drafted, submitted, negotiation, approved/contracted, declined and expired. A lead is not funding.

### programs
Fields: id, partner_id, agreement_id, program_code, name, description, start_date, end_date, locations, target_population, status, eligibility_rule_version, governance_owner_id, delivery_owner_id, reporting_calendar, closeout_status.

### agreements
Fields: id, partner_id, agreement_type, reference_number, signed_on, effective_from, effective_to, currency, approved_amount, restricted_fund_code, document_id, signatory_id, amendment_of_id, status.

Only signed and authorised agreements support contracted/funded status. An uncommitted offer is stored as an opportunity, not a grant received.

### budgets and budget_lines
Budget fields: id, program_id, fund_id, version, status, currency, approved_total, approved_by, approved_at.
Budget line fields: budget_id, cost_code, description, unit, quantity, unit_cost, line_total, allowable_cost_rule, procurement_threshold, variance_threshold.

Budget changes are versioned. A signed budget is never silently overwritten.

### indicators, indicator_periods and indicator_observations
Indicator fields: code, name, definition, result_level (input/output/outcome/impact), unit, numerator_definition, denominator_definition, disaggregation, collection_method, frequency, data_source, owner_role, verification_method.
Period target fields: indicator_id, period_start, period_end, baseline_value, target_value, approved_at.
Observation fields: indicator_period_id, value, measure_state, observed_at, reported_by, evidence_id, verification_state, verified_by, verified_at, correction_of_id.

Do not calculate percentage achievement when target, unit, baseline or source are incompatible. Suppress small sensitive disaggregation cells where they could identify a person.

### activities, deliverables, monitoring_visits and verification_reviews
Include program/activity, planned and actual dates, location, owner, deliverable, participant/service links, source/evidence IDs, visit method, finding, reviewer and corrective action.

### grievances and safeguarding_cases
Separate restricted case tables with designated roles and strict read audit. Never put case narratives into ordinary activity notes or partner reports.

## 5. Standards and compliance

### standards, standard_versions and standard_controls
Store issuer, scheme, scope, version, publication date, binding/effective date, replacement date, official source URL, language, control ID, source section, control summary, applicability logic, evidence type, review frequency and responsible function.

### applicability_decisions
Fields: standard_version_id, control_id, organisation_id, program_id nullable, site_id nullable, commodity, applies, reason, reviewer_id, reviewed_at.

### assessments, inspections, findings and corrective_actions
Store subject, control and version, assessment round, inspector, scheduled/completed dates, result, evidence list, nonconformity category, root cause, correction, corrective/preventive action, owner, due date, closure evidence, effectiveness check and closure verifier.

An internal inspection is not a third-party audit. A certificate record requires issuer, certificate reference, scope, site/member coverage, issue/expiry dates, validity and source evidence.

## 6. Supply chain and market

### trading_partners, contracts and purchase_orders
Include counterparty type, legal identity, due diligence, commodity/product form, grade, volume, price basis, premium/deduction, delivery terms, delivery window, validity, payment terms and authorised signatories.

### farmer_deliveries
Fields: id, producer_id, farm_id, plot_id where available, delivery_ticket, delivery_at, collection_point_id, commodity_code, product_form, gross_weight, tare_weight, net_weight, unit, scale_id, scale_calibration_reference, operator_id, witness_id, acceptance_state, evidence_id.

### quality_tests
Fields: delivery_id or lot_id, method, sample_id, sampled_at, lab_or_assessor, moisture, defects, grade, cupping_score, result_state, evidence_id, verified_by.

An internal test is not an accredited laboratory certificate.

### lots, lot_memberships and lot_events
A lot represents one commodity and product form with explicit source relationships. Split, merge, blend and transformation are events with input and output lot IDs.

Each event stores a unique ID, organisation, event type, occurred_at, actor, location, product code/form, quantity/unit, source/destination parties, source/output lots, evidence and verification state.

### inventory_movements and mass_balance_periods
Capture opening stock, receipts, production input/output, shipments, sales, losses, adjustments and closing stock for each product form, location, unit and period. Every adjustment requires a reason and approval. Transformations across different product forms use separate input/output lines and an approved yield/loss method.

### market_observations
Fields: kind (global benchmark, national reference, local quote, buyer offer, farm-gate quote or realised sale), source/URL, observed_at, commodity, product form, grade, value, currency, unit, delivery point, quantity band, premium/deduction, valid_until, evidence and capture method.

Do not mix benchmark, offer and realised price in one series without explicit classification.

## 7. Finance, procurement and assets

### funds, fund_restrictions, cash_accounts, journal_entries and journal_lines
Identify the funding source and restrictions. Existing cashbook remains separate from the general ledger until reconciled and migrated with a verified opening balance.

### procurements, quotations, purchase_orders, goods_receipts, invoices, payments and bank_reconciliations
Retain the complete approval chain and supporting files. Approval and payment roles should be separated. Store quote comparisons and conflict-of-interest declarations where applicable.

### assets and asset_movements
Track acquisition, source fund, serial/asset number, location, custodian, condition, inspection, maintenance, transfer and disposal.

## 8. Evidence, imports, exports and audit

### evidence_documents and evidence_versions
Fields: source filename, private object key, SHA-256 hash, MIME, byte count, uploader, created_at, received_at, source date, language, privacy classification, retention code, linked entity, original/revised relationship, malware-scan state and verification state.

### import_batches and import_rows
Store template/version, source organisation, uploaded file hash, importer, created_at, row count, mapping, validation errors, duplicate candidates, accepted/rejected state and resulting entity IDs. Never import directly into live tables without preview.

### export_packages and export_items
Store purpose, data scope, requester, approver, redaction rules, generated_at, expiry, recipients, exact source record versions and download audit.

### audit_events and outbox_events
Append-only events store actor, action, subject, timestamp, request/correlation ID, prior/new state reference, reason and source. Outbox events are written in the same transaction as the domain change and delivered idempotently.

## 9. Cross-domain constraints

1. An enrolment references one program and one person; unique active enrolment is configurable per program.
2. Every person, plot, lot and program relation stays within the organisation boundary.
3. A delivery is not accepted without a valid ticket, product form, positive measured net weight, operator and source/collection point.
4. A traceability event cannot be deleted once referenced by a later event; use reversal/correction events.
5. Lot transformation preserves input/output lineage and records the conversion method and quantity.
6. Mass balance is compared for the same product form, unit, location and period; variance requires investigation.
7. Partner export requires active permission and a lawful data-sharing basis; it is auditable and expires.
8. External verification/certification requires issuer, reference, scope, issue/expiry, verifier and evidence.
9. Grant cost postings require an accounting period and source fund.
10. Every material correction preserves the prior value and a reason.

## 10. Migration decision

Do not map every existing generic records.data value into relational tables in one operation. First inventory live record kinds and field distributions on an isolated QA database. Then map each legacy kind to a target entity; report counts, duplicates, orphan attachments and field-level errors; create additive tables and compatibility adapters; backfill synthetic pilot data; compare old/new representations; and only import live records after the group reviews the mapping and explicitly approves it.
