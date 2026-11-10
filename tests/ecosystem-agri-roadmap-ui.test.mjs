import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  futureModules,
  operationalTemplates,
  templateDestinations,
} from "../src/features/agriculture/templates.mjs";

const read = (path) => readFileSync(path, "utf8");

test("template catalogue is documentation in the shared Help Centre, not a business menu", () => {
  const page = read("src/app/dashboard/[[...section]]/page.tsx");
  const nav = read("src/app/_components/dashboard-navigation.tsx");
  const registry = read("src/features/enterprise/registry.ts");
  const help = read("src/app/_components/help-center.tsx");
  assert.ok(page.includes('import HelpCenter from "../../_components/help-center"'));
  assert.ok(page.includes('<HelpCenter role={admin.role} />'));
  assert.ok(page.includes('redirect("/dashboard/panduan#template")'));
  assert.ok(nav.includes('href="/dashboard/panduan"'));
  assert.ok(!registry.includes('id: "pengembangan"'));
  assert.ok(!registry.includes('href: "/dashboard/pengembangan"'));
  assert.ok(help.includes('id="template"'));
  assert.ok(help.includes("operationalTemplates.map"));
  assert.ok(help.includes("futureModules.map"));
  assert.ok(!help.includes("<form"));
});

test("every existing template routes its real input to an owning workspace", () => {
  assert.equal(operationalTemplates.filter((item) => item.formStatus === "template_ready").length, 7);
  for (const template of operationalTemplates.filter((item) => item.formStatus === "template_ready")) {
    const destination = templateDestinations[template.id];
    assert.ok(destination, template.id + " has a domain destination");
    assert.ok(destination.route.startsWith("/dashboard/"), template.id);
    assert.ok(["existing_domain_form", "field_mapping_pending"].includes(destination.inputStatus), template.id);
  }
  assert.equal(templateDestinations["partner-engagement-log"].route, "/dashboard/kemitraan");
  assert.equal(templateDestinations["tot-session-record"].route, "/dashboard/kegiatan");
  assert.equal(templateDestinations["tot-attendance-roster"].route, "/dashboard/kehadiran");
  assert.equal(templateDestinations["tot-action-plan"].route, "/dashboard/tindaklanjut");
  assert.equal(templateDestinations["partner-document-register"].route, "/dashboard/register");
  assert.equal(templateDestinations["program-preparation-checklist"].route, "/dashboard/kemitraan");
  assert.equal(templateDestinations["member-intake-basic"].route, "/dashboard/anggota");
});

test("Pusat Bantuan is readable by all legacy roles and stays separate from data-entry authorization", () => {
  const policy = read("src/features/identity/access-policy.ts");
  const page = read("src/app/dashboard/[[...section]]/page.tsx");
  assert.ok(policy.includes("'panduan'"));
  assert.ok(page.includes('"panduan"'));
  assert.ok(page.includes("canReadSection(admin, active)"));
});

test("future modules stay informational and have no clickable route", () => {
  assert.ok(futureModules.length >= 10);
  assert.ok(futureModules.every((item) => item.status === "coming_soon"));
  const help = read("src/app/_components/help-center.tsx");
  assert.ok(help.includes("Segera hadir"));
  assert.ok(help.includes("Modul berikut belum aktif dan tidak memiliki formulir atau penyimpanan data."));
});

test("the previous roadmap component is no longer the dashboard implementation", () => {
  const page = read("src/app/dashboard/[[...section]]/page.tsx");
  assert.ok(!page.includes("AgencyRoadmap"));
  assert.ok(page.includes('redirect("/dashboard/panduan#template")'));
});
