# SRIKANDI BUANA v13 — Delivery Roadmap and Acceptance Gates

## Delivery principle

The goal is a working operational system, not a large menu of unfinished modules. Build one complete journey at a time. Do not put new modules in the sidebar until their data model, permissions, workflow, tests and help text are ready.

## Stage 0 — Safe architecture foundation

**Current branch:** feat/agri-agency-v13-foundation  
**Scope:** approved platform blueprint, external-source register and staged roadmap.  
**Database:** no new migration in this stage.  
**Production:** untouched.

Acceptance:
- Existing v12 Preview still works.
- This branch is isolated from v12 and Production.
- No existing records, users, files or routes are deleted.
- The domain model distinguishes organisation, person, member, beneficiary, producer, farm, plot, program and supply-chain lot.
- Every external standard/partner source has a URL, version/date and status.

## Stage 1 — Organisation and secure data foundation

Build:
- Organisation profile, organisational units, officer terms and registration register.
- Permission catalogue: resource/action/scope, separation of duties and member self-service.
- Person master, membership, consent ledger, profile verification and controlled document vault.
- Import/export with preview, row-level errors, duplicate suggestions, idempotent import batch and change log.
- Organisation readiness register for SIMLUHTAN, AHU, NIB/OSS, NPWP and program-specific partner IDs.

Acceptance:
- A member can see and request correction of their own data.
- A field enumerator can register an assigned person without viewing all member identity documents.
- One member can have separate program enrolments without duplicating the person.
- An external partner cannot enumerate the full membership database.
- All private data access and exports are audited.

## Stage 2 — Program management and beneficiary services

Build:
- Partner directory and opportunity pipeline.
- Agreement register, program setup, locations, eligibility, budget, schedule and results framework.
- Beneficiary enrolment, eligibility decision, services, attendance, feedback and grievance.
- Activity and task workflow with evidence, review, correction and approval.
- MEAL indicators: definition, unit, baseline, target, actual, method, source, date, disaggregation and verification.
- Donor report builder with report snapshots and evidence manifest.

Acceptance:
- One program can be set up using its actual agreement without hardcoded donor assumptions.
- Beneficiary totals are deduplicated and can be traced to member/participant source records.
- Planned, delivered, measured, verified and externally accepted values are displayed separately.
- A report can be regenerated from its snapshot and evidence links.

## Stage 3 — Farm and producer registry

Build:
- Producer profile, farm, plot, tenure relationship and controlled geolocation.
- Crop/season, farm diary, practices, inputs, training, seedlings, harvest and measured yield.
- Offline-first assisted field forms with sync conflict handling and audit.
- CSV/XLSX mapping templates for official and partner registers, beginning with the fields actually required by the group's active program and the local agriculture office.

Acceptance:
- Plot area and map source/accuracy can be verified.
- A farm is never assigned to a person without an accountable relationship.
- Sensitive coordinates and land documents remain restricted.
- Estimates and measured actuals are not conflated.

## Stage 4 — Quality, certification readiness and safeguards

Build:
- Versioned standard/control library.
- Rainforest Alliance current document profile and GMR export mapping.
- Internal Management System, risk assessments, internal inspections, findings, CAPA and reviewer sign-off.
- Safeguard topics, incident/grievance case controls and role-restricted evidence.
- EUDR data-readiness checks and source quality status.

Acceptance:
- No expired checklist is presented as current.
- “Internally ready” is never displayed as “certified”.
- Every finding has an owner, due date, evidence and closure verification.
- EUDR plot/lot data can be exported for an authorised buyer after consent and scope review.

## Stage 5 — Traceable supply chain and buyer access

Build:
- Farmer deliveries, weigh tickets, quality testing and lot creation.
- Inventory, lot split/merge, processing transformation, storage, shipment and custody event.
- Mass-balance reconciliation and exception workflows.
- Buyer/supplier master, offtake contract, delivery schedule, quote, realised price and payment reconciliation.
- Partner read-only workspace and lot QR traceability page with approved public fields only.

Acceptance:
- A shipped lot can be traced back to contributing deliveries, farmers and plots using authorised access.
- Transformation and mass-balance calculations reconcile.
- Claims and certification status are tied to valid external records.
- Public QR data exposes no member identity, private location or confidential commercial information.

## Stage 6 — Finance, procurement and group business

Build:
- Restricted program budgets and separate organisational/business funds.
- Procurement request, approvals, vendor selection, purchase order, goods receipt, invoice, payment and reconciliation.
- Group savings/loan ledger only after policy, member consent, authority and legal review; no banking or public deposit-taking capability.
- Reconcile Buku Kas, ledger and bank statements before consolidated financial reporting.

Acceptance:
- Segregation of duties is tested.
- A transaction cannot exceed approved funds without an authorised exception.
- Corrections are appended, not silently overwritten.
- No statutory financial claims without accountant review.

## Stage 7 — Market intelligence and impact reporting

Build:
- ICO indicator reference feed/manual import with source date, unit and licence/terms review.
- Domestic statistics register and local buyer quote capture.
- Actual realised-price reporting linked to contract, quality, delivery and payment.
- Program and organisation dashboards for women’s economic empowerment, production, quality, training, market access, environmental practices and delivery outcomes.
- Indonesian and English reporting templates.

Acceptance:
- Every market number displays source and timestamp.
- Benchmarks are not displayed as promised farm-gate prices.
- Every impact metric has a data dictionary and methodology.
- AI-generated narratives are drafts linked to source records and require human approval.

## Initial pilot choice

The first live pilot should be the one program for which SRIKANDI BUANA has an actual written offer/agreement, named contact, scope, target participants, budget and reporting requirements. CARE/SUCAFINA women-farmer economic empowerment is an especially relevant candidate based on their published KUPM program model; Rainforest Alliance readiness is a parallel standards/traceability track; Ministry compatibility is a local institutional track. The application must not assume that the group has been accepted into any one of these programs or copy another group's targets.

## Cross-stage release gates

- Unit, integration, security, permission-denial, import/export and regression tests.
- Browser tests for all role-based critical journeys.
- Data migration report with before/after counts and referential integrity.
- Tested backup and restore on isolated QA.
- Accessibility review and mobile/low-bandwidth test.
- Preview deployed against a sanitised QA database only.
- Human acceptance by the group before any Production release.
- Explicit approval for each Production migration and deployment.

## First user journeys to complete

1. Register a woman farmer with a simple consent notice and verify only required fields.
2. Link her to a group and farm, with plot mapping only when justified and consented.
3. Set up an actual program from its signed agreement and define its eligibility.
4. Enrol an eligible participant and record a delivered service/training with attendance evidence.
5. Record a field visit and a measured result with source and verifier.
6. Aggregate a coffee delivery into a traceable lot and record quality/weight.
7. Generate a partner report and evidence package with privacy filtering.
8. Let the member view their own profile, service history and complaint/correction route.

