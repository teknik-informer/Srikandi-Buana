export type TemplateField = {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "number" | "select" | "url";
  section: string;
  required?: boolean;
  min?: number;
  max?: number;
  maxLength?: number;
  options?: readonly string[];
  sensitivity?: "personal" | "internal" | "restricted";
};
export type OperationalTemplate = {
  id: string;
  version: number;
  name: string;
  description: string;
  category: string;
  lifecycle: string;
  formStatus: "template_ready" | "coming_soon";
  sections: readonly { id: string; title: string }[];
  fields: readonly TemplateField[];
};
export const TEMPLATE_CATALOG_VERSION: string;
export const opportunityStages: readonly string[];
export const operationalTemplates: readonly OperationalTemplate[];
export const futureModules: readonly {
  id: string;
  name: string;
  area: string;
  status: "coming_soon";
  description: string;
}[];
export function getOperationalTemplate(templateId: string): OperationalTemplate | null;
export function getTemplateSections(templateId: string): readonly { id: string; title: string }[];
export function getFutureModules(): Array<{
  id: string;
  name: string;
  area: string;
  status: "coming_soon";
  description: string;
  route: null;
  interactive: false;
}>;
export function validateTemplateDraft(templateId: string, payload?: Record<string, unknown>): {
  valid: boolean;
  status: "unknown_template" | "coming_soon" | "needs_correction" | "draft_validated";
  templateId?: string;
  templateVersion?: number;
  errors: Array<{ field: string | null; message: string }>;
  note?: string;
};
