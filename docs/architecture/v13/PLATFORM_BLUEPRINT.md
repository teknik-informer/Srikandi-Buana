# SRIKANDI BUANA v13 — Agri-Agency & Producer Ecosystem Blueprint

**Status:** Architecture proposal approved for staged implementation on an isolated feature branch  
**Branch:** feat/agri-agency-v13-foundation  
**Base:** v12 enterprise foundation  
**Production:** unchanged; this document is not a Production release or a certification statement.

## 1. Product direction

SRIKANDI BUANA is to evolve from a group administration dashboard into a trusted **women-farmer organisation, program implementation, producer-services and supply-chain operating platform**.

The platform must serve two legitimate identities at the same time:

1. **Institution and implementation partner:** the group organises members, manages governance, receives and executes programs, administers grants and activities, procures goods and services, measures results, maintains evidence, and reports to government, NGOs, buyers and auditors.
2. **Member and beneficiary service:** each woman farmer can access her own profile, farm information, training, services, market access, program entitlements, grievance channels and group business services without having to understand the organisation's back office.

The platform is not itself a government registration authority, certification body, auditor, bank, buyer or donor. It prepares accurate records, controls access, tracks external registration and assessment status, and produces evidence for the institutions that have authority to verify or decide.

**North-star outcome:** an authorised reviewer can answer, from one controlled record system: who was served, under which mandate, where and when an activity happened, what resources were used, what changed, what evidence supports the result, who verified it, and which supply-chain lot or payment is connected to it.

## 2. Operating model: one group, two service directions

Treat these as separate but connected business domains:

| Direction | The platform manages | The platform must not assume |
|---|---|---|
| Organisation as implementing partner | Legal identity, governance, capacity, staff/volunteers, policies, due diligence, contracts, budgets, procurement, delivery, safeguarding, monitoring, audit and reporting | That a group is already a legal entity, licensed business or approved implementing partner |
| Individual as member/beneficiary/producer | Person profile, membership, farm/household profile, needs, eligibility, enrolment, services, attendance, production, feedback and outcomes | That membership automatically makes a person eligible for every donor or government program |
| Group as producer/supplier | Member farms, harvest, aggregation, quality, custody, inventory, processing, sales, buyer contracts and traceability | That a registered lot is certified, export-ready or compliant until the relevant checks and external decisions are documented |

A person can be a member of the organisation and separately be enrolled in several programs. A beneficiary does not have to be a member unless that program requires it. A farm plot belongs to a producer/tenure relationship, not automatically to the group. Every program must define its own eligibility, required fields, consent purpose, benefits and reporting rules.

## 3. Legal identity and institutional readiness

The organisation profile must distinguish the group's operational identity from its legal and administrative registrations. Store each registration as a separate verified record:

- Ministry of Agriculture farmer-institution registration: institution type, SIMLUHTAN identifier or reference, village/area code, responsible extension office/BPP, verification date, supporting document and current status.
- Farmer institution development status: KWT, Poktan, Gapoktan, KUPM, Kelembagaan Ekonomi Petani (KEP), association or other officially recognised category, as confirmed by the relevant authority.
- Legal entity registration: AHU record for an association or cooperative, or another chosen legal form where appropriate; deed, ministerial decree, amendments, authorised officers and beneficial-owner information where required.
- Business registration: NIB/OSS, tax registration, business classifications, operational permits and bank account ownership where applicable.
- Program-specific registrations: donor portal, Rainforest Alliance/MyRA/RACP, buyer/supplier code, traceability or certification identifiers.

Do not collapse these identifiers into one generic “registration number”. Each identifier needs an issuing authority, legal basis, number, holder, scope, issue/expiry dates, status, evidence file, verifier and change history.

A government registration or a legal-entity approval must be recorded only after the issuing authority has confirmed it. The application can prepare export files and a readiness checklist; it must not display “registered with the Ministry”, “AHU-approved” or “certified” merely because a form was completed.

### Recommended institutional pathway

1. Maintain the existing KWT identity and its authentic membership/governance records.
2. Confirm the correct farmer-institution category and registration with the agricultural extension officer/BPP and the district agriculture office. Where the program needs it, validate the group's record and member data against SIMLUHTAN and the current e-RDKK process.
3. Decide, with members and competent advisers, whether a cooperative, association, KUPM or another structure is needed for collective trading, member services or grant contracting. Do not create overlapping legal bodies without clear mandates, bank accounts and control rules.
4. Where a separate non-profit association and a cooperative/business entity are both justified, document their relationship, asset ownership, service contracts, conflicts of interest and separate accounting.
5. Maintain an institutional document room: deed/AD-ART, member assembly decisions, officer appointments, work plan, policies, tax/business documents, bank authority, annual reports and amendments.

Permentan 67/PERMENTAN/SM.050/12/2016 is the Ministry's farmer-institution development regulation and is listed as in force by the national legal regulation database; it repealed Permentan 82/2013. The local extension office must confirm how the current rules and systems apply to this particular group and commodity. The system must not rely on the superseded 2013 regulation.

## 4. Governance and agency operating structure

Build a scalable functional organisation, not a fixed company chart that forces a small group to hire staff it does not have.

| Function | Accountability |
|---|---|
| Member Assembly / Musyawarah | Membership mandate, AD-ART, election, annual plan, major decisions and accountability |
| Supervisory / Internal Control | Review of funds, procurement, conflicts of interest, complaints, evidence and management actions |
| Executive Coordination | Annual strategy, partner relationships, decisions, delivery priorities and organisational performance |
| Secretariat & Governance | Membership register, letters, minutes, resolutions, policies, registration, records and document control |
| Member & Beneficiary Services | Onboarding, data quality, eligibility, consent, services, inclusion, feedback and grievance routing |
| Program Management & MEAL | Proposal pipeline, grant lifecycle, logframe, activities, indicators, field verification, learning and donor reporting |
| Agriculture & Extension | Farm registry, crop calendar, agronomy, training, inputs, climate resilience and farm practices |
| Quality, Certification & Safeguards | Internal management system, standards register, risk assessment, internal inspection, corrective actions, worker safety and environmental/social safeguards |
| Supply Chain & Market Access | Farmer deliveries, aggregation, quality, lot management, processing, warehouse, buyers, contracts, logistics and traceability |
| Finance, Procurement & Assets | Restricted budgets, cash/bank, accounting, procurement, disbursement, inventory assets and reconciliations |
| Data, Technology & Information Security | Access management, personal-data protection, data quality, integrations, backup, incident response and system administration |

These are **accountability functions**, not necessarily separate people. One person may hold multiple roles in a small group, but sensitive actions must use separation of duties: the same person should not create, approve and reconcile the same financial transaction or certify their own field inspection. Exceptions require a documented second reviewer and reason.

## 5. User experiences and access roles

Use one coherent application shell, but provide different work queues and simple language by role.

- Member / farmer: personal information, own farm/plot, program invitations and enrolments, training schedule, delivered services, harvest/delivery receipts, group notices, consent and grievance.
- Field enumerator: assisted registration, assigned farm mapping, survey forms, training attendance and field evidence; no access to unrelated members' financial or identity files.
- Farmer-group leader: membership, meetings, farm services, work plans, assigned program summaries and approvals allowed by mandate.
- Program coordinator: only assigned programs, beneficiaries, activities, indicators, evidence and reports.
- Finance officer: approved budgets, eligible cost codes, procurement, cash/bank, disbursement, receipts, reconciliation and finance evidence.
- Quality/compliance officer: standard controls, farm inspections, findings, corrective actions, risk assessments, evidence and expiry reminders.
- Supply-chain operator: deliveries, quality checks, lot movements, transformations, inventory and shipments.
- Executive / board: organisation-wide management summaries and approval queues; personal details are masked unless needed for a defined duty.
- Internal reviewer / external partner: time-limited, read-only or explicitly permitted access to one program, site, cohort, report or evidence package.
- Platform administrator: system availability and access administration; no blanket right to browse private identity, banking, safeguarding or land-tenure files.

Access must be defined by resource + action + organisation + program + location + record scope. Roles are permission bundles, not proof that a person should see every record. Partner access must be revocable, time-limited, logged and limited to the agreement's scope.

## 6. Core workspaces and modules

The workspace navigation can change from the current generic seven areas into the following business capabilities while preserving existing URLs through compatibility routes during migration.

### A. Pusat Kendali

One command centre with role-specific work queues: tasks due, upcoming field visits, unverified records, program milestones, missing evidence, approvals, budget alerts, expiring registrations/certificates, delayed delivery, stock anomalies and unresolved complaints.

Every alert must link to the record and explain why it exists. “Zero” means no record in the selected scope, not success or proof of impact. Show “Belum ada data”, “Belum dinilai”, “Tidak berlaku” and “Terverifikasi” as different states.

### B. Anggota & Penerima Manfaat

- Quick registration from phone or assisted enumerator workflow.
- One person profile with distinct membership history, household relationships where justified, program enrolments and producer profile.
- Required fields are driven by a purpose/program template. Do not force the full national ID, bank, household or sensitive data into a general member form.
- Consent and notice are captured per purpose: membership administration, program delivery, partner sharing, location mapping, photos/media and publication are separate choices.
- Duplicate checks suggest possible matches; an authorised human resolves them. Never merge people automatically.
- Track eligibility decision, reason, verifier and appeal/review route for each programme.
- Member self-service to view/correct their information, see shared data scopes and ask for help.

### C. Organisasi & Tata Kelola

Member register, officer terms, roles, unit/subgroup structure, assembly decisions, meeting minutes, resolutions, AD-ART, policies, internal control, conflict-of-interest declarations, annual plans, work plans, registration records and official correspondence.

### D. Program, Kemitraan & MEAL

Opportunity pipeline → due diligence → proposal → negotiation → signed agreement → program setup → beneficiary enrolment → implementation → monitoring → verification → reporting → closeout and learning.

Each program must hold:
- Partner and donor identity, agreement and authorised contact.
- Scope, locations, period, target population and eligibility rules.
- Theory of change, results framework/logframe, outputs, outcomes and indicators.
- Baseline, target, actual, data source, method, frequency, disaggregation and verification.
- Activities, calendar, PIC, participants, attendance, deliverables and evidence.
- Approved budget, restricted fund, cost categories, procurement thresholds, disbursement schedule and expenditure evidence.
- Risk register, safeguarding, grievance and incident pathways, corrective actions and partner access.
- Report templates, due dates, submission versions, reviewer comments and acceptance status.

A draft proposal, verbal offer, MoU, grant agreement and active funded program are different states. The platform must never treat an opportunity as funding received.

### E. Kebun, Petani & Produksi

- Farm and plot registry linked to a producer and a documented tenure relationship.
- GPS point/polygon, area, boundary source, mapping date, accuracy, mapper, consent and verification.
- Crop/species, planting year, plot use, agroforestry/shade, water, soil, input records and harvest history.
- Farm diary: work, input, pest/disease observations, irrigation, harvest, training and field advisory.
- Yield and harvest estimates clearly separated from measured/verified actuals.
- Labour and worker-safety observations, land-use and environmental risk controls when relevant to a standard or agreement.
- Input and seedling distribution with supplier, quantity, recipient, lot, date and outcome.

Plot geography and land-tenure documents are sensitive. Do not expose precise polygons or proof of ownership in a public map or general partner export.

### F. Mutu, Sertifikasi & Safeguards

- Standards library with source, version, publication date, binding/effective date, expiry/replacement, scope and source document.
- Applicable-control mapping by crop, farm type, site, group, supply-chain actor and program.
- Internal management system (IMS), member farm registry, risk assessment, training, internal inspection, evidence, findings and corrective/preventive action.
- Worker/labour, human rights, child/forced labour risk, occupational safety, pesticide/chemical management, biodiversity, deforestation, water and grievance topics when applicable.
- Every control has applicability rationale, responsible person, status, last check, evidence, reviewer and next review date.
- Certification claim states: not assessed, preparation, self-assessment, internal inspection, corrective action open, submitted to certification body, external audit, certificate verified, suspended, expired or not applicable.

Internal readiness is not third-party certification. Only an issuing certification body and official certificate record can support a “certified” statement.

### G. Rantai Pasok & Pasar

- Buyer/supplier/collector/processor/warehouse master data and due diligence.
- Purchase/offtake contracts, volume, quality, pricing basis, delivery window, premium/discount, rejected volume and settlement.
- Farmer delivery ticket and weighing: producer, plot/source, date/time, product form, gross/tare/net weight, unit, scale ID/calibration, operator and witness.
- Quality tests and grading: moisture, defects, density, screen, cup score, sensory notes and sampling method; distinguish internal assessment from accredited laboratory results.
- Unique lot and sub-lot identifiers, storage, segregation, movement, transformation/yield, blending, packaging and shipment.
- Every movement or transformation is an event with actor, time, location, source lot, destination lot, quantity, unit and supporting documents.
- Reconcile mass balance: opening + received + produced - shipped - losses = closing stock, by product, lot, location and unit. Exceptions need an investigation record.
- Chain-of-custody status and certification claims follow the applicable partner/certification scheme. Never mix certified and non-certified material without the required segregation and records.

### H. Keuangan, Pengadaan & Aset

Separate organisation funds, restricted program grants, revolving group funds (if legally and operationally authorised) and commercial trading funds. Require approved budget lines and fund codes for every disbursement. Record request → approval → purchase → receipt → invoice → payment → reconciliation. Include supplier due diligence, quote comparisons, conflict-of-interest declaration and asset handover.

The existing Buku Kas and double-entry ledger must remain separate until an explicit reconciliation and migration are completed. Reports must disclose any unreconciled difference. Do not label accounts audited, tax-compliant or statutory financial statements without professional review.

### I. Intelijen Pasar

Combine:
- Official/public market indicators (for example, International Coffee Organization daily composite and group indicator prices, plus monthly market reports).
- Domestic statistics and public policy/market notices from verified government sources.
- Local farm-gate/buyer quotes entered by the group with source, date, grade, quantity, delivery point, currency, validity and contact.
- Historical realised sale prices from signed contracts and paid invoices.

Show the distinction between global benchmark, futures/indicative quote, domestic wholesale quote, buyer offer and the group's actual net realised price. Every figure must include source, timestamp, unit, currency, grade and any premium/deduction. The ICO indicator price is a benchmark, not an automatic farm-gate price or guaranteed offer for the group.

### J. Portal Mitra & Ruang Audit

Provide separately permissioned workspaces for each donor, buyer, certification body, government reviewer or evaluator. A partner sees only agreed fields, program scope and approved evidence. Include export manifests, period filters, data-owner approval, redaction, watermarking, download logs, expiry and revocation. No partner receives unrestricted access to the entire membership database.

## 7. Evidence-first operating rules

Every important result is a chain of linked evidence, not a free-text success claim:

- Source record: who recorded it, when, on which form/device, and from which source.
- Validation: completeness, range, duplicate and cross-record checks.
- Verification: who checked it, what method was used, when, and whether it passed, failed or needs correction.
- Approval: who authorised the decision and under which authority.
- Evidence: private original, checksum, version, metadata, related record, access scope and retention category.
- Correction: never overwrite a verified historical value silently; record old/new values, reason, actor and reviewer.
- Reporting snapshot: preserve the exact dataset and evidence manifest used for a submitted report.

Separate planned, delivered, observed, measured, verified and externally accepted results. Never infer impact from participation counts alone.

## 8. International traceability and EUDR readiness

Model traceability using Critical Tracking Events (CTEs) and Key Data Elements (KDEs): identify the relevant events in each commodity process and capture the minimum data needed to describe each event. Align interoperable event exports with GS1 traceability principles and ISO 22005 design principles where relevant.

For coffee linked to EU markets, maintain the information that the exporter/importer may need for due diligence: producer and plot reference, geolocation, production period, commodity/volume, relevant legality evidence, plot history and the downstream due-diligence statement reference supplied by the responsible operator. The group should prepare and maintain source data; it should not claim to file an importer's EUDR due-diligence statement or certify deforestation-free status unless it is explicitly authorised and has the required verification.

As listed by the European Commission on 8 November 2026, the current EUDR application dates are 30 December 2026 for large and medium operators/traders and 30 June 2027 for micro and small enterprises. Applicability depends on the role and size of the economic operator and the product scope; legal review is required for each contract. Treat this as an urgent buyer-readiness capability, not a certificate.

## 9. Personal-data protection, safeguarding and trust

Design to Indonesia's Personal Data Protection Law (UU 27/2022) and the actual obligations that apply to the organisation and its partners.

- Define who is the data controller and processor for each program and document the agreement.
- Record purpose, lawful basis, notice version, consent where required, recipient, retention period and withdrawal/correction workflow.
- Minimise national ID, date of birth, financial, household, precise location and worker data. Encrypt sensitive fields and files; mask them in lists and exports.
- Use separate data-sharing consent and an approval gate before sharing beneficiary-level data with external partners.
- Provide rights request, correction and complaint workflows with responsible officers and response logs.
- Define retention and secure deletion schedules, legal holds, breach reporting and access review.
- Store safeguarding/sexual exploitation/abuse/harassment reports in a restricted case system, not in ordinary activity notes.
- No public list of beneficiaries, personal phone numbers, identity numbers, bank accounts or exact farm polygons.

## 10. Technology architecture

Keep a **modular monolith** for the current scale and team. The current Next.js application and Neon PostgreSQL are a suitable starting point; do not introduce microservices, multiple databases or distributed transactions merely to look enterprise-grade.

Use:
- Domain modules with their own validation, application services, repository methods and tests.
- PostgreSQL relational tables for authoritative person, farm, program, finance, traceability and compliance data.
- JSONB only for controlled flexible attributes, form answers and source payloads where a stable relational model is not justified.
- Composite tenant/workspace foreign keys and scoped queries; the authenticated server identity is the only source of tenant ownership.
- Append-only business event and audit history for material changes.
- Transactional outbox for reliable notification/report-generation jobs.
- Private object storage for identity, land, financial, agreement and audit evidence; separate public media storage.
- Versioned API and CSV/XLSX templates with import preview, error report, duplicate review and import audit.
- Role-scoped PWA and assisted data-entry workflows designed for intermittent connectivity.
- Observability: correlation IDs, structured logs, error alerts, queue retries, database health, backup/restore drills and security event review.

Do not store sensitive identity documents in public media delivery. A successful upload is not proof that a document is authentic.

## 11. Target domain data model

The following is the target map, not a database migration. Define and test each bounded domain before creating production tables.

| Domain | Main entities |
|---|---|
| Identity & organisations | organisations, organisation_units, legal_registrations, officers, roles, permissions, people, memberships |
| Member services | households, consent_grants, profile_verifications, service_cases, feedback, grievances |
| Beneficiaries | programs, eligibility_rules, beneficiary_enrolments, service_deliveries, attendance, appeals |
| Farm registry | farms, plots, plot_boundary_versions, tenure_evidence, crops, farm_practices, farm_inputs, harvests |
| Program delivery | partners, opportunities, agreements, budgets, budget_lines, activities, tasks, milestones, deliverables |
| MEAL | indicator_definitions, baselines, targets, observations, disaggregation, evidence_links, verification_reviews, learning_actions |
| Compliance | standard_catalog, standard_versions, requirement_controls, applicability, assessments, findings, corrective_actions, internal_inspections |
| Supply chain | trading_partners, contracts, farmer_deliveries, quality_tests, lots, lot_events, transformations, inventory_movements, shipments |
| Market | market_sources, price_observations, buyer_offers, sales_contracts, realised_prices |
| Finance & procurement | funds, cash_accounts, chart_of_accounts, journals, procurements, purchase_orders, receipts, payments, reconciliations, assets |
| Evidence & audit | documents, document_versions, access_grants, audit_events, data_exports, integration_runs, outbox_events |

All cross-domain relationships must enforce the organisation/tenant boundary at database level, not just in UI filters. Person, member, beneficiary, farm and program identifiers are not interchangeable.

## 12. Data quality and assurance states

Use a common state vocabulary that prevents false confidence:

- Draft / source not checked
- Submitted
- Needs correction
- Internally verified
- Approved by authorised organisation officer
- Externally verified (issuer and reference required)
- Expired / suspended / withdrawn
- Not applicable (reason required)

An empty value is not zero, and zero is not an empty value. Preserve the difference between measured zero, not yet measured, not reported, not applicable and withheld by consent.

## 13. AI and assisted work

AI may assist with:
- Converting voice notes into draft activity logs and meeting minutes.
- Suggesting a task list from an approved meeting decision.
- Translating partner reports between Indonesian and English.
- Summarising verified source data and identifying missing fields or inconsistent totals.
- Drafting proposal/report narratives with links to the exact evidence used.

AI must not:
- Invent beneficiaries, yields, training attendance, income, geolocation or certification results.
- Approve beneficiaries, financial transactions, procurement, payments or certification findings.
- Change verified source records without human review.
- Generate a donor claim from incomplete or unverified records.
- Send private member data to an external model without the required agreement, purpose and safeguards.

All AI-generated text is marked as a draft, cites its source records internally, and requires named human approval before external submission.

## 14. Rollout and non-regression

- Preserve the v11.5 Production deployment and the v12 QA branch.
- Build v13 on a new feature branch based on the reviewed v12 foundation.
- Do not delete existing generic records, routes, accounts, files or migration history.
- Use additive migrations and staged compatibility adapters.
- Test schema and backfill on a separate sanitised QA database. A QA Preview must never fall back to Production database credentials.
- Introduce synthetic QA records with a visible “DATA UJI” marker only; do not seed fake members, fake farms, fake transactions or fabricated program achievements into operational workspaces.
- A migration is not complete until counts, references, role access, exports and rollback/forward-fix procedures have been tested.
- Keep a separate Production release approval. Preview READY and CI success do not authorise Production promotion.

## 15. Definition of a trusted agency platform

A reviewer must be able to reproduce a reported figure from source entries, understand the eligibility and methodology, inspect approvals, see corrections and trace each supporting document. An auditor must be able to distinguish internal checks from external certification. A member must be able to know what information is collected and who can access it. A buyer must be able to trace a delivered lot back to its source without receiving unrelated personal data. A government officer must be able to check the group's own evidence and the official reference numbers without the platform pretending to be the government's registry.

That is the standard the rebuild will target.
