import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeAgencyAction, listAgencyPermissions } from "../src/features/agriculture/access.mjs";

const principal = (role, overrides = {}) => ({
  accountId: role + "-account",
  userId: role + "-user",
  organisationId: "org-1",
  role,
  assignedProgramIds: ["program-1"],
  assignedSiteIds: ["site-1"],
  ...overrides,
});
const record = (overrides = {}) => ({
  organisationId: "org-1",
  programId: "program-1",
  siteId: "site-1",
  ...overrides,
});
const now = new Date("2026-11-08T00:00:00.000Z");

test("program coordinators can work only inside assigned program scopes", () => {
  assert.equal(authorizeAgencyAction({
    principal: principal("program_coordinator"),
    resource: "beneficiary", action: "create", record: record(), now,
  }).allowed, true);
  assert.equal(authorizeAgencyAction({
    principal: principal("program_coordinator"),
    resource: "beneficiary", action: "create", record: record({ programId: "program-2" }), now,
  }).allowed, false);
});

test("member self-service is restricted to their own person record", () => {
  assert.equal(authorizeAgencyAction({
    principal: principal("member", { personId: "person-1" }),
    resource: "person", action: "read_own",
    record: record({ personId: "person-1" }), now,
  }).allowed, true);
  assert.equal(authorizeAgencyAction({
    principal: principal("member", { personId: "person-1" }),
    resource: "person", action: "read_own",
    record: record({ personId: "person-2" }), now,
  }).allowed, false);
});

test("partner access requires an active unexpired program-scoped grant", () => {
  const request = {
    principal: principal("partner_viewer"),
    resource: "report", action: "read",
    record: record({ containsPersonalData: false }),
    grant: {
      active: true, expiresAt: "2026-12-01T00:00:00.000Z",
      organisationId: "org-1", resources: ["report"], actions: ["read"],
      programIds: ["program-1"], siteIds: ["site-1"],
    },
    now,
  };
  assert.equal(authorizeAgencyAction(request).allowed, true);
  assert.equal(authorizeAgencyAction({
    ...request, record: record({ programId: "program-2" }),
  }).allowed, false);
  assert.equal(authorizeAgencyAction({
    ...request, grant: { ...request.grant, expiresAt: "2026-11-01T00:00:00.000Z" },
  }).allowed, false);
});

test("partner and internal reviewer grants remain read-only", () => {
  const request = {
    principal: principal("partner_viewer"),
    resource: "report", action: "create",
    record: record({ containsPersonalData: false }),
    grant: {
      active: true, expiresAt: "2026-12-01T00:00:00.000Z",
      organisationId: "org-1", resources: ["report"], actions: ["create"],
      programIds: ["program-1"], siteIds: ["site-1"],
    },
    now,
  };
  assert.equal(authorizeAgencyAction(request).allowed, false);
  assert.equal(authorizeAgencyAction({ ...request, principal: principal("internal_reviewer") }).allowed, false);
});

test("finance and quality reviewer roles are read-only capabilities", () => {
  assert.equal(authorizeAgencyAction({
    principal: principal("finance_reviewer"),
    resource: "finance", action: "read", record: record(), now,
  }).allowed, true);
  assert.equal(authorizeAgencyAction({
    principal: principal("finance_reviewer"),
    resource: "finance", action: "create_transaction", record: record(), now,
  }).allowed, false);
  assert.equal(authorizeAgencyAction({
    principal: principal("quality_reviewer"),
    resource: "standard", action: "read", record: record(), now,
  }).allowed, true);
});

test("partner grants cannot expose personal records without specific approval", () => {
  const request = {
    principal: principal("partner_viewer"),
    resource: "report", action: "read",
    record: record({ containsPersonalData: true }),
    grant: {
      active: true, expiresAt: "2026-12-01T00:00:00.000Z",
      organisationId: "org-1", resources: ["report"], actions: ["read"],
      programIds: ["program-1"], siteIds: ["site-1"],
    },
    now,
  };
  assert.equal(authorizeAgencyAction(request).allowed, false);
  assert.equal(authorizeAgencyAction({
    ...request, grant: { ...request.grant, personalDataApproved: true },
  }).allowed, true);
});

test("partner grants must include the exact assigned site", () => {
  const request = {
    principal: principal("partner_viewer"),
    resource: "report", action: "read",
    record: record({ containsPersonalData: false }),
    grant: {
      active: true, expiresAt: "2026-12-01T00:00:00.000Z",
      organisationId: "org-1", resources: ["report"], actions: ["read"],
      programIds: ["program-1"], siteIds: ["site-2"],
    },
    now,
  };
  assert.equal(authorizeAgencyAction(request).allowed, false);
});

test("basic person data requires a role with explicit person-read authority", () => {
  assert.equal(authorizeAgencyAction({
    principal: principal("field_enumerator"),
    resource: "person", action: "read",
    record: record({ containsPersonalData: true, personalDataClass: "basic" }), now,
  }).allowed, true);
  assert.equal(authorizeAgencyAction({
    principal: principal("executive"),
    resource: "person", action: "read",
    record: record({ containsPersonalData: true, personalDataClass: "basic" }), now,
  }).allowed, false);
});

test("platform administrators cannot browse business data by default", () => {
  assert.equal(authorizeAgencyAction({
    principal: principal("platform_admin"),
    resource: "membership", action: "read", record: record(), now,
  }).allowed, false);
  assert.equal(authorizeAgencyAction({
    principal: principal("platform_admin"),
    resource: "system", action: "manage_access", record: record(), now,
  }).allowed, true);
});

test("financial and programme approvals enforce separation of duties", () => {
  const actor = principal("executive");
  assert.equal(authorizeAgencyAction({
    principal: actor,
    resource: "finance", action: "approve_transaction",
    record: record({ createdBy: actor.accountId }), now,
  }).allowed, false);
  assert.equal(authorizeAgencyAction({
    principal: principal("executive", { accountId: "different-executive" }),
    resource: "finance", action: "approve_transaction",
    record: record({ createdBy: "finance-officer-account" }), now,
  }).allowed, true);
});

test("old or unknown roles fail closed until explicitly migrated", () => {
  assert.equal(authorizeAgencyAction({
    principal: principal("admin"),
    resource: "organisation", action: "read", record: record(), now,
  }).allowed, false);
  assert.deepEqual(listAgencyPermissions("partner_viewer"), []);
});
