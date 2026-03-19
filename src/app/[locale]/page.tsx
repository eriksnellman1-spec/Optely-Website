import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import Strengths from "@/components/home/Strengths";
import Services from "@/components/home/Services";
import HowWeWork from "@/components/home/HowWeWork";
import ProcessSteps from "@/components/home/ProcessSteps";
import Testimonials from "@/components/home/Testimonials";
import WhyOptely from "@/components/home/WhyOptely";
import BookingSection from "@/components/home/BookingSection";
import FAQ from "@/components/home/FAQ";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Strengths />
      <Services />
      <HowWeWork />
      <ProcessSteps />
      <Testimonials />
      <WhyOptely />
      <BookingSection />
      <FAQ />
    </>
  );
}
