"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { XIcon } from "lucide-react"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-[var(--color-carbon-black)]/25 duration-150 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  placement = "center",
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean
  placement?: "center" | "bottom"
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        data-placement={placement}
        className={cn(
          "relative fixed z-50 flex w-full flex-col gap-5 border-0 bg-[var(--color-paper-white)] text-[15px] text-[var(--color-carbon-black)] shadow-[var(--shadow-subtle)] outline-none duration-200",
          placement === "bottom"
            ? "inset-x-0 bottom-0 top-auto h-[min(92dvh,920px)] max-h-[min(92dvh,920px)] max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-t-[20px] p-0 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-8 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-8 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[min(90vh,900px)] sm:w-full sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[15px] sm:data-open:slide-in-from-bottom-0 sm:data-open:zoom-in-95 sm:data-closed:slide-out-to-bottom-0 sm:data-closed:zoom-out-95"
            : "top-1/2 left-1/2 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-[15px] p-6 sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute top-3 right-3 size-9 rounded-full text-[var(--color-zinc-gray)] hover:bg-[var(--color-fog-gray)] hover:text-[var(--color-carbon-black)]"
                size="icon-sm"
              />
            }
          >
            <XIcon className="size-4" />
            <span className="sr-only">Закрыть</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5 pr-8 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close
          render={
            <Button
              variant="outline"
              className="rounded-full"
            />
          }
        >
          Закрыть
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "text-[19px] font-bold leading-[1.25] tracking-[-0.012em] text-[var(--color-carbon-black)]",
        className
      )}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-[14px] leading-[1.45] tracking-[-0.005em] text-[var(--color-zinc-gray)]",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
