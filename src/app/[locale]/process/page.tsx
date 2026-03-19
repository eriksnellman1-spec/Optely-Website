import { useTranslations } from "next-intl";
import HowWeWork from "@/components/home/HowWeWork";
import ProcessSteps from "@/components/home/ProcessSteps";
import ScrollReveal from "@/components/shared/ScrollReveal";

function ProcessContent() {
  const t = useTranslations("process_page");
  return (
    <div className="min-h-screen bg-bg pt-28">
      <ScrollReveal className="px-6 pb-2 text-center">
        <h1 className="font-syne text-5xl font-extrabold text-white md:text-6xl">
          {t("heading")}
        </h1>
      </ScrollReveal>
      <HowWeWork />
      <ProcessSteps />
    </div>
  );
}

export default function ProcessPage() {
  return <ProcessContent />;
}
