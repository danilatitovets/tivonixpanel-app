"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "tivonix_global_announcement_academy_v3";

const ACADEMY_UPDATE_POINTS = [
  "О компании TIVONIX — кто мы и что предлагать клиентам",
  "Где искать клиентов — площадки, запросы, уровни сложности",
  "10 ниш с готовыми сообщениями и признаками подходящего клиента",
  "Библиотека шаблонов — что писать по площадке, нише и ситуации",
  "Условия выплат и отбор в команду",
];

export function GlobalAnnouncementModal({ ready }: { ready: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      /* private mode — still show */
    }
    queueMicrotask(() => setOpen(true));
  }, [ready]);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function openAcademy() {
    dismiss();
    router.push("/academy");
  }

  if (!open) return null;

  return (
    <Dialog open onOpenChange={(visible) => !visible && dismiss()}>
      <DialogContent
        showCloseButton
        className="!flex max-h-[min(92dvh,820px)] w-[calc(100%-2rem)] !max-w-3xl !flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-[#f4f4f5] p-0 text-[#18181b] shadow-2xl ring-0 z-[100] sm:!max-w-4xl [&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:z-10 [&_[data-slot=dialog-close]]:text-[#18181b]/60 [&_[data-slot=dialog-close]]:hover:bg-[#18181b]/5 [&_[data-slot=dialog-close]]:hover:text-[#18181b]"
      >
        <header className="relative shrink-0 border-b border-[#ebebeb] bg-white px-6 pb-6 pt-10 text-center sm:px-8 sm:pb-7 sm:pt-11">
          <Image
            src="/images/tl-Photoroom.png"
            alt="TIVONIX"
            width={320}
            height={112}
            priority
            className="mx-auto h-11 w-auto object-contain sm:h-14"
          />
          <span className="mt-4 inline-flex rounded-full bg-[#f4f4f5] px-3 py-1 text-sm font-medium text-[#18181b]">
            Второе обновление
          </span>
          <DialogTitle className="mt-4 text-center font-sans text-2xl font-semibold leading-tight tracking-tight text-[#18181b] sm:text-[1.75rem]">
            How to find clients
          </DialogTitle>
          <DialogDescription className="sr-only">
            Переработали раздел обучения для партнёров TIVONIX
          </DialogDescription>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-y-contain px-6 py-5 sm:px-8 sm:py-6">
          <p className="text-center text-base leading-relaxed text-[#71717a] sm:text-lg">
            Переработали обучение для вашего удобства: где искать, что писать, как добавить лида в
            CRM и получить выплату.
          </p>

          <div className="mt-5 rounded-2xl bg-white p-5 sm:mt-6 sm:p-6">
            <p className="text-base font-semibold text-[#18181b] sm:text-lg">Что нового:</p>
            <ul className="mt-4 space-y-3">
              {ACADEMY_UPDATE_POINTS.map((point) => (
                <li key={point} className="flex gap-2.5 text-base leading-snug text-[#18181b]">
                  <span className="shrink-0 text-emerald-600">✓</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 pb-1 text-center text-base leading-relaxed text-[#71717a]">
            Открой раздел{" "}
            <Link href="/academy" className="font-medium text-[#18181b] underline underline-offset-2">
              «How to find clients»
            </Link>{" "}
            в меню слева — там всё по шагам.
          </p>
        </div>

        <footer className="shrink-0 space-y-2 border-t border-[#ebebeb] bg-white px-6 py-4 sm:px-8 sm:py-5">
          <button
            type="button"
            onClick={openAcademy}
            className="h-12 w-full rounded-full bg-[var(--color-sunrise-coral)] text-base font-medium text-white transition-colors hover:opacity-90 active:scale-[0.99] sm:h-[3.25rem] sm:text-lg"
          >
            Open обучение
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="h-11 w-full rounded-xl text-base font-medium text-[#71717a] transition-colors hover:bg-[#f4f4f5] hover:text-[#18181b]"
          >
            Понятно
          </button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
