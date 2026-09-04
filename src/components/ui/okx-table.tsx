import { cn } from "@/lib/utils";

export function OkxTableScroll({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "-mx-4 overflow-x-auto overscroll-x-contain px-4 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8",
        className
      )}
      {...props}
    />
  );
}

export function OkxTable({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <table
      className={cn(
        "w-full max-w-full border-separate border-spacing-0 text-sm max-lg:table-auto lg:table-fixed",
        className
      )}
      {...props}
    />
  );
}

export function OkxTableHead({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn(className)} {...props} />;
}

export function OkxTableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn(className)} {...props} />;
}

export function OkxTh({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "px-3 pb-4 text-left text-sm font-normal text-[#71717a]",
        className
      )}
      {...props}
    />
  );
}

export function OkxTr({
  className,
  interactive = true,
  ...props
}: React.ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        "group/row [&>td]:border-b [&>td]:border-[var(--color-mist-gray)] last:[&>td]:border-b-0",
        interactive &&
          "[&>td]:transition-colors hover:[&>td]:bg-[var(--color-fog-gray)] hover:[&>td:first-child]:rounded-l-2xl hover:[&>td:last-child]:rounded-r-2xl",
        className
      )}
      {...props}
    />
  );
}

export function OkxTd({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn(
        "px-3 py-5 align-middle text-[#18181b]",
        className
      )}
      {...props}
    />
  );
}

/** Первая колонка: иконка + жирное имя + серый подзаголовок */
export function OkxCellPrimary({
  title,
  subtitle,
  initials,
  className,
}: {
  title: string;
  subtitle?: string;
  initials?: string;
  className?: string;
}) {
  const letters =
    initials ??
    title
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f5] text-xs font-semibold text-[#18181b]">
        {letters}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#18181b]">{title}</p>
        {subtitle && (
          <p className="truncate text-sm text-[#71717a]">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/** OKX pill-кнопка в таблице */
export function OkxTableAction({
  children,
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & {
  variant?: "primary" | "secondary";
}) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full px-5 py-1.5 text-sm font-medium transition-colors",
        variant === "primary" &&
          "bg-[var(--color-sunrise-coral)] text-white hover:opacity-90",
        variant === "secondary" &&
          "bg-[var(--color-fog-gray)] text-[var(--color-zinc-gray)] hover:bg-[var(--color-mist-gray)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function OkxTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-[#e4e4e7]", className)}>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative shrink-0 pb-3 text-sm transition-colors",
                isActive
                  ? "font-semibold text-[#18181b]"
                  : "font-normal text-[#71717a] hover:text-[#18181b]"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1 font-normal text-[#71717a]">{tab.count}</span>
              )}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--color-sunrise-coral)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function OkxPageTitle({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)}>
      <h1 className="text-[30px] font-normal leading-[1.2] tracking-[-0.013em] text-[var(--color-carbon-black)] md:text-[37px]">
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl text-[15px] leading-[1.5] tracking-[-0.005em] text-[var(--color-zinc-gray)] md:text-[17px] md:leading-[1.4]">
          {description}
        </p>
      )}
    </div>
  );
}

export function OkxSearch({
  value,
  onChange,
  placeholder = "Search",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <svg
        className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#71717a]"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
        />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-full border-0 bg-[#f4f4f5] pl-11 pr-4 text-sm text-[#18181b] placeholder:text-[#71717a] outline-none focus:ring-2 focus:ring-[#18181b]/10"
      />
    </div>
  );
}

const PAGE_BUTTON =
  "flex size-9 items-center justify-center rounded-xl text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-35";

export function OkxPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-[#f4f4f5] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5",
        className
      )}
    >
      <p className="text-sm text-[#71717a]">
        Показано {start}–{end} из {totalItems}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={cn(PAGE_BUTTON, "bg-white/50 text-[#71717a] hover:bg-white hover:text-[#18181b]")}
            aria-label="Предыдущая страница"
          >
            ←
          </button>

          <span
            className={cn(
              PAGE_BUTTON,
              "sm:hidden bg-[var(--color-sunrise-coral)] text-white"
            )}
            aria-current="page"
          >
            {page}
          </span>

          <div className="hidden max-w-[min(100%,280px)] items-center gap-1 overflow-x-auto sm:flex">
            {pages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={cn(
                  PAGE_BUTTON,
                  "shrink-0",
                  p === page
                    ? "bg-[var(--color-sunrise-coral)] text-white"
                    : "bg-white/50 text-[#71717a] hover:bg-white hover:text-[#18181b]"
                )}
                aria-label={`Страница ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={cn(PAGE_BUTTON, "bg-white/50 text-[#71717a] hover:bg-white hover:text-[#18181b]")}
            aria-label="Следующая страница"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
