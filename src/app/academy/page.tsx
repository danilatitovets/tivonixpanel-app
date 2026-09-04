"use client";

import { useEffect, useRef, useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { AcademyPageHeader } from "@/components/academy/academy-page-header";
import { AcademyCardBody } from "@/components/academy/academy-card";
import { AcademyStartSection } from "@/components/academy/academy-start-section";
import { PlatformSearchGrid } from "@/components/academy/platform-search-grid";
import { PlatformDifficultyBlock } from "@/components/academy/platform-difficulty";
import { PriorityNicheCards } from "@/components/academy/priority-niche-cards";
import { ClientFitBlock } from "@/components/academy/client-fit-block";
import { ClientMessagesSection } from "@/components/academy/client-messages-section";
import { AfterReplyGuide } from "@/components/academy/after-reply-guide";
import { SelectionPayoutBlock } from "@/components/academy/selection-payout-block";
import { DailyPlanPractical } from "@/components/academy/daily-plan-practical";
import { MistakesList } from "@/components/academy/mistakes-list";
import { LeadExamplesPractical } from "@/components/academy/lead-examples-practical";
import { FaqAccordion } from "@/components/academy/faq-accordion";
import { AcademyNav, getAcademyScrollOffset } from "@/components/academy/academy-nav";
import { useAddLeadSheet } from "@/components/leads/add-lead-context";
import { RoleGuard } from "@/components/access/role-guard";
import { AboutTivonixSection, AboutTivonixHeader } from "@/components/academy/about-tivonix-section";
import { UNIVERSAL_START_MESSAGE, MESSAGE_SUBTITLE } from "@/lib/academy-message-templates";
import {
  PRACTICAL_ACADEMY_SECTIONS,
  PRACTICAL_PLATFORMS,
  PRIORITY_NICHES,
  CLIENT_FIT_YES,
  CLIENT_FIT_NO,
  AFTER_REPLY_QUESTIONS,
  AFTER_REPLY_CRM_STEPS,
  DAILY_PLAN_LEVELS,
  DAILY_CHECKLIST_ITEMS,
  PLATFORM_DIFFICULTY,
  LEAD_REJECT_MISTAKES,
  PRACTICAL_LEAD_EXAMPLES,
  PRACTICAL_FAQ,
} from "@/lib/academy-practical-data";

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-[var(--academy-scroll-offset)] text-lg font-bold tracking-tight text-[#18181b] sm:text-xl md:text-2xl"
    >
      {children}
    </h2>
  );
}

const SECTION_SCROLL_CLASS = "scroll-mt-[var(--academy-scroll-offset)]";

export default function AcademyPage() {
  const { open: openAddLead } = useAddLeadSheet();
  const [activeSection, setActiveSection] = useState("start");
  const scrollingRef = useRef(false);

  const universalMessage = UNIVERSAL_START_MESSAGE;

  function scrollToSection(id: string) {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (!el) return;

    scrollingRef.current = true;
    const offset = getAcademyScrollOffset();
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
    window.setTimeout(() => {
      scrollingRef.current = false;
    }, 900);
  }

  useEffect(() => {
    const sectionIds = PRACTICAL_ACADEMY_SECTIONS.map((s) => s.id);

    function updateActiveSection() {
      if (scrollingRef.current) return;

      const offset = getAcademyScrollOffset();
      let current = sectionIds[0];

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;

        const top = el.getBoundingClientRect().top;
        if (top <= offset) {
          current = id;
        }
      }

      setActiveSection((prev) => (prev === current ? prev : current));
    }

    updateActiveSection();

    window.addEventListener("scroll", updateActiveSection, { passive: true });
    document.addEventListener("scroll", updateActiveSection, { passive: true, capture: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      document.removeEventListener("scroll", updateActiveSection, { capture: true });
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  return (
    <RoleGuard>
      <AppLayout
        title=""
        hideTitle
        compactTopbar
        showAddLead={false}
        showSearch={false}
        mainClassName="overflow-x-hidden"
      >
        <div className="pb-28 lg:pb-24">
          <AcademyNav
            activeSection={activeSection}
            onSelect={scrollToSection}
            compactTopbar
          />

          <div className="mx-auto max-w-4xl space-y-12 lg:max-w-5xl lg:space-y-14">
              <AcademyPageHeader />

              <section id="start" className={`${SECTION_SCROLL_CLASS} space-y-6`}>
                <SectionTitle id="start-title">Начни отсюда</SectionTitle>
                <AcademyStartSection
                  universalMessage={universalMessage}
                  onFindClients={() => scrollToSection("platforms")}
                  onAddLead={openAddLead}
                  onPayouts={() => scrollToSection("payouts")}
                />
              </section>

              <section id="about-tivonix" className={`${SECTION_SCROLL_CLASS} space-y-8`}>
                <AboutTivonixHeader />
                <AboutTivonixSection />
              </section>

              <section id="payouts" className={`${SECTION_SCROLL_CLASS} space-y-4`}>
                <SectionTitle id="payouts-title">Условия выплат и отбор</SectionTitle>
                <SelectionPayoutBlock />
              </section>

              <section id="platforms" className={`${SECTION_SCROLL_CLASS} space-y-6`}>
                <div>
                  <SectionTitle id="platforms-title">Где искать клиентов</SectionTitle>
                  <p className="mt-2 text-base text-[#71717a] md:text-[17px]">
                    Открой площадку, нажми «Выбрать запрос» и скопируй нужную нишу в поиск.
                  </p>
                </div>
                <PlatformSearchGrid platforms={PRACTICAL_PLATFORMS} />
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-[#18181b]">
                    Источники по уровню сложности
                  </h3>
                  <PlatformDifficultyBlock tiers={PLATFORM_DIFFICULTY} />
                </div>
              </section>

              <section id="niches" className={`${SECTION_SCROLL_CLASS} space-y-6`}>
                <div>
                  <SectionTitle id="niches-title">Кого искать в первую очередь</SectionTitle>
                  <p className="mt-2 text-base leading-relaxed text-[#71717a]">
                    10 ниш для старта: где искать, запросы, признаки подходящего клиента, что предложить,
                    боли, реалистичный результат и готовое первое сообщение.
                  </p>
                </div>
                <PriorityNicheCards niches={PRIORITY_NICHES} />
                <div className="space-y-4">
                  <h3 className="text-base font-semibold text-[#18181b]">
                    Как понять, что клиенту можно писать
                  </h3>
                  <ClientFitBlock yesItems={CLIENT_FIT_YES} noItems={CLIENT_FIT_NO} />
                </div>
              </section>

              <section id="templates" className={`${SECTION_SCROLL_CLASS} space-y-5`}>
                <div>
                  <SectionTitle id="templates-title">Что писать клиенту</SectionTitle>
                  <p className="mt-2 text-base leading-relaxed text-[#71717a] md:text-[17px]">
                    {MESSAGE_SUBTITLE}
                  </p>
                </div>
                <ClientMessagesSection />
              </section>

              <section id="after-reply" className={`${SECTION_SCROLL_CLASS} space-y-4`}>
                <SectionTitle id="after-reply-title">Что делать, если клиент ответил</SectionTitle>
                <AfterReplyGuide
                  questions={AFTER_REPLY_QUESTIONS}
                  crmSteps={AFTER_REPLY_CRM_STEPS}
                />
              </section>

              <section id="crm" className={`${SECTION_SCROLL_CLASS} space-y-4`}>
                <SectionTitle id="crm-title">Как добавить лида в CRM</SectionTitle>
                <AcademyCardBody>
                  <p className="text-sm leading-relaxed text-[#71717a]">
                    Перед добавлением проверь дубль: CRM сама проверит совпадение по Instagram,
                    Telegram, сайту или телефону.
                  </p>
                  <ol className="mt-4 space-y-2">
                    {AFTER_REPLY_CRM_STEPS.map((step, i) => (
                      <li key={step} className="flex gap-3 text-sm text-[#18181b]">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold">
                          {i + 1}
                        </span>
                        <span className="pt-1">{step}</span>
                      </li>
                    ))}
                  </ol>
                  <button
                    type="button"
                    onClick={openAddLead}
                    className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-[var(--color-sunrise-coral)] px-5 text-sm font-medium text-white sm:w-auto"
                  >
                    Добавить лида
                  </button>
                </AcademyCardBody>
              </section>

              <section id="plan" className={`${SECTION_SCROLL_CLASS} space-y-4`}>
                <SectionTitle id="plan-title">План на день</SectionTitle>
                <DailyPlanPractical
                  levels={DAILY_PLAN_LEVELS}
                  checklistItems={DAILY_CHECKLIST_ITEMS}
                />
              </section>

              <section id="mistakes" className={`${SECTION_SCROLL_CLASS} space-y-6`}>
                <SectionTitle id="mistakes-title">Ошибки, из-за которых лид не засчитают</SectionTitle>
                <MistakesList
                  items={LEAD_REJECT_MISTAKES}
                  title="Чего избегать"
                />
                <div>
                  <h3 className="mb-4 text-base font-semibold text-[#18181b]">
                    Примеры хорошего и плохого лида
                  </h3>
                  <LeadExamplesPractical
                    good={PRACTICAL_LEAD_EXAMPLES.good}
                    bad={PRACTICAL_LEAD_EXAMPLES.bad}
                  />
                </div>
              </section>

              <section id="faq" className={`${SECTION_SCROLL_CLASS} space-y-4`}>
                <SectionTitle id="faq-title">FAQ</SectionTitle>
                <FaqAccordion items={PRACTICAL_FAQ} />
              </section>
          </div>
        </div>
      </AppLayout>
    </RoleGuard>
  );
}
