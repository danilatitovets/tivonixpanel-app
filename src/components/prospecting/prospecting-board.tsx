import { BOARD_COLUMNS } from "@/lib/prospecting-data";
import { getNextAction } from "@/lib/prospecting-utils";
import type { ProspectContact, ProspectStatus } from "@/lib/prospecting-types";
import { ProspectCard } from "@/components/prospecting/prospect-card";

interface ProspectingBoardProps {
  prospects: ProspectContact[];
  onOpen: (id: string) => void;
  onStatusChange: (id: string, status: ProspectStatus) => void;
}

export function ProspectingBoard({ prospects, onOpen, onStatusChange }: ProspectingBoardProps) {
  return (
    <div className="w-full min-w-0 space-y-3 md:space-y-0">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap lg:flex-nowrap">
        {BOARD_COLUMNS.map((col) => {
            const items = prospects.filter((p) => {
              if (col.status === "duplicate") {
                return ["duplicate", "not_relevant", "do_not_contact"].includes(p.status);
              }
              if (col.status === "needs_check") {
                return ["new", "needs_check", "checked"].includes(p.status);
              }
              return p.status === col.status;
            });

            return (
              <div
                key={col.status}
                className="flex w-full min-w-0 flex-col rounded-2xl bg-[#f4f4f5] p-3 md:w-[calc(50%-0.375rem)] lg:w-64 lg:shrink-0"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="truncate text-xs font-semibold text-[#18181b]">{col.label}</h3>
                  <span className="shrink-0 text-xs text-[#9ca3af]">{items.length}</span>
                </div>
                <div className="min-h-[120px] space-y-2">
                  {items.map((p) => (
                <ProspectCard
                  key={p.id}
                  prospect={p}
                  nextAction={getNextAction(p)}
                  onOpen={() => onOpen(p.id)}
                  onStatusChange={onStatusChange}
                />
                  ))}
                  {items.length === 0 && (
                    <p className="py-4 text-center text-xs text-[#9ca3af]">Пусто</p>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
