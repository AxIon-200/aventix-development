import PageShell from "@/components/layout/PageShell";
import Hero from "@/components/Hero";
import TrendingEvents from "@/components/TrendingEvents";
import BrowseCategory from "@/components/BrowseCategory";
import HowItWorks from "@/components/HowItWorks";
import WhyChooseUs from "@/components/WhyChooseUs";
import Testimonials from "@/components/Testimonials";
import OrganizerBanner from "@/components/OrganizerBanner";

export default function Home() {
  return <PageShell>
    <Hero />
    <TrendingEvents />
    <BrowseCategory />
    <HowItWorks />
    <WhyChooseUs />
    <Testimonials />
    <OrganizerBanner href="/register/organizer" />
  </PageShell>;
}
