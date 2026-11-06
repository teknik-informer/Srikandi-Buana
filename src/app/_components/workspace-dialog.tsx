"use client";
import type { ComponentProps } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";

export function WorkspaceDialogContent({
  children,
  className,
  showCloseButton = true,
  ...props
}: ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      {...props}
      className={cn("workspace-dialog", className)}
      showCloseButton={false}
    >
      {children}
      {showCloseButton && (
        <DialogClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Tutup dialog"
            className="absolute top-2 right-2"
          >
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
      )}
    </DialogContent>
  );
}
