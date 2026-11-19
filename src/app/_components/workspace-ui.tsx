"use client";
import { Children, Fragment, cloneElement, isValidElement, type ComponentType, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Search, X, Files, AppWindow, RefreshCw, Plus, Download, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { cn } from "@/lib/cn";


function getActionText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getActionText).filter(Boolean).join(" ").trim();
  if (isValidElement<{ children?: ReactNode }>(node)) return getActionText(node.props.children);
  return "";
}
function containsActionIcon(node: ReactNode): boolean {
  if (Array.isArray(node)) return node.some(containsActionIcon);
  if (!isValidElement<{ children?: ReactNode }>(node)) return false;
  if (node.type !== Fragment && typeof node.type !== "string") return true;
  return containsActionIcon(node.props.children);
}
function labelActionNodes(node: ReactNode): ReactNode {
  if (typeof node === "string" || typeof node === "number") return <span className="workspace-action-label">{node}</span>;
  if (Array.isArray(node)) return node.map((child, index) => <Fragment key={index}>{labelActionNodes(child)}</Fragment>);
  if (isValidElement<{ children?: ReactNode }>(node) && node.props.children !== undefined) {
    return cloneElement(node, { children: labelActionNodes(node.props.children) });
  }
  return node;
}
function normalizeWorkspaceActions(node: ReactNode): ReactNode[] {
  if (Array.isArray(node)) return node.flatMap(normalizeWorkspaceActions);
  if (node == null || typeof node === "boolean") return [];
  if (!isValidElement<{ children?: ReactNode; className?: string; "aria-label"?: string; title?: string }>(node)) return [node];
  if (node.type === Fragment) return normalizeWorkspaceActions(node.props.children);
  if (node.type === Button) {
    const label = getActionText(node.props.children) || node.props["aria-label"] || node.props.title || "Tindakan";
    const key = label.toLocaleLowerCase("id");
    const icon = key.includes("muat ulang") || key.includes("refresh") ? <RefreshCw aria-hidden="true" />
      : key.includes("tambah") || key.includes("buat") ? <Plus aria-hidden="true" />
      : key.includes("ekspor") || key.includes("export") ? <Download aria-hidden="true" />
      : key.includes("unduh") || key.includes("download") ? <FileDown aria-hidden="true" />
      : null;
    const original = node.props.children;
    const hasIcon = containsActionIcon(original);
    return [cloneElement(node, {
      className: cn("workspace-header-action", node.props.className),
      "aria-label": node.props["aria-label"] || label,
      title: node.props.title || label,
      children: <>{!hasIcon && icon}{labelActionNodes(original)}</>,
    })];
  }
  if (node.props.children !== undefined) {
    return [cloneElement(node, { children: Children.toArray(node.props.children).flatMap(normalizeWorkspaceActions) })];
  }
  return [node];
}

export function WorkspacePageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading workspace-page-heading" data-workspace-hero="true">
      <div className="workspace-hero-identity">
        <span className="workspace-hero-icon" aria-hidden="true">
          <AppWindow />
        </span>
        <div className="min-w-0 space-y-1">
          {eyebrow && (
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h1 id="workspace-title">{title}</h1>
          {description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="heading-actions workspace-page-actions flex min-w-0 max-w-full flex-wrap items-center gap-2">{normalizeWorkspaceActions(actions)}</div>
      )}
    </div>
  );
}
export function WorkspaceSearch({
  value,
  onChange,
  label,
  placeholder,
  className,
  disabled = false,
  maxLength,
  ignoreUnsaved = false,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  ignoreUnsaved?: boolean;
  label: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <InputGroup className={cn("workspace-search min-w-0", className)}>
      <InputGroupAddon>
        <Search aria-hidden="true" />
      </InputGroupAddon>
      <InputGroupInput
        aria-label={label}
        disabled={disabled}
        maxLength={maxLength}
        data-unsaved-ignore={ignoreUnsaved || undefined}
        value={value}
        placeholder={placeholder || label}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape" && value) {
            event.preventDefault();
            onChange("");
          }
        }}
      />
      {value && (
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            aria-label={"Hapus pencarian: " + label}
            onClick={() => onChange("")}
          >
            <X />
          </InputGroupButton>
        </InputGroupAddon>
      )}
    </InputGroup>
  );
}
export function WorkspaceEmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="min-h-44">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Files />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children}
    </Empty>
  );
}
export function WorkspaceMetric({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="workspace-metric min-w-0">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardAction>
          <Icon className="size-4 text-muted-foreground" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-medium leading-tight tracking-tight tabular-nums break-words">
          {value}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
export function statusTone(value: string) {
  if (
    [
      "Selesai",
      "Siap",
      "Aktif",
      "Terverifikasi",
      "Terbit",
      "Diterima",
      "Disahkan internal",
    ].includes(value)
  )
    return "success";
  if (["Berjalan", "Dalam proses", "Disepakati", "Diperiksa"].includes(value))
    return "active";
  if (
    [
      "Tinggi",
      "Perlu verifikasi",
      "Perlu perbaikan",
      "Lewat tenggat",
      "Ditahan",
      "Perlu diperiksa",
    ].includes(value)
  )
    return "warning";
  if (["Ditolak", "Rusak", "Tidak aktif", "Mengundurkan diri"].includes(value))
    return "danger";
  return "neutral";
}
const tones = {
  success:
    "border-green-200 bg-green-500/10 text-green-700 dark:border-green-900/40 dark:bg-green-500/15 dark:text-green-300",
  active:
    "border-primary/20 bg-primary/10 text-primary",
  warning:
    "border-amber-200 bg-amber-500/10 text-amber-800 dark:border-amber-900/40 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted/50 text-muted-foreground",
};
export function StatusBadge({ value }: { value: unknown }) {
  const label = String(value ?? "").trim() || "Belum ditetapkan";
  const tone = statusTone(label);
  return (
    <Badge
      variant="outline"
      data-status-tone={tone}
      className={cn(
        "h-auto min-h-6 max-w-full whitespace-normal leading-snug",
        tones[tone],
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />
      {label}
    </Badge>
  );
}
