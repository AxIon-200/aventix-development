import type { Metadata } from "next";
import PageShell from "@/components/layout/PageShell";
import ContactForm from "@/components/contact/ContactForm";

export const metadata: Metadata = {
  title: "Contact | Aventix",
  description: "Questions about tickets, events, organizers, or your Aventix experience? Get in touch.",
};

const CHANNELS = [
  { title: "Email", body: "support@aventix.ph" },
  { title: "Organizer Support", body: "organizers@aventix.ph" },
  { title: "Response Time", body: "We aim to reply within 1–2 business days." },
];

const FAQ = [
  "Need help with a ticket or booking?",
  "Want to list an event on Aventix?",
  "Looking for refund or policy information?",
];

export default function ContactPage() {
  return (
    <PageShell>
      <section aria-labelledby="contact-title" className="bg-[#0b0c10]">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-center gap-10 px-4 py-16 sm:px-6 lg:min-h-[440px] lg:flex-row lg:items-center lg:justify-between lg:px-[120px]">
          <div className="max-w-[690px]">
            <p className="text-sm font-semibold text-[#66fcf1]">CONTACT AVENTIX</p>
            <h1 id="contact-title" className="mt-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-[52px] lg:leading-[68px]">
              Let’s talk about live music.
            </h1>
            <p className="mt-4 max-w-[590px] text-base leading-7 text-[#c5c6c7]">
              Questions about tickets, events, organizers, or your Aventix experience? Send us a message and our team will get back to you.
            </p>
          </div>
          <div
            aria-hidden
            className="flex w-full flex-col gap-[18px] overflow-hidden rounded-3xl border border-[#66fcf1]/35 bg-gradient-to-r from-[#45a29e] to-[#66fcf1] to-[125%] p-7 text-[#0b0c10] lg:h-[280px] lg:w-[420px] lg:shrink-0"
          >
            <p className="font-display text-3xl font-bold">WE’RE HERE TO HELP</p>
            <p className="whitespace-pre text-sm font-semibold">Tickets  •  Events  •  Organizers</p>
            <p className="text-[13px] font-semibold">Aventix Support</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="channels-heading" className="bg-[#0b0c10]">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-[120px] lg:py-16">
          <h2 id="channels-heading" className="font-display text-3xl font-bold text-white sm:text-4xl">
            How can we help?
          </h2>
          <ul className="mt-7 grid gap-5 md:grid-cols-3">
            {CHANNELS.map((c) => (
              <li key={c.title} className="rounded-2xl border border-[#2c3644] bg-[#1f2833] p-6">
                <h3 className="font-display text-base font-bold leading-8 text-white">{c.title}</h3>
                <p className="mt-2.5 text-[13px] text-[#c5c6c7]">
                  {c.body.includes("@") ? (
                    <a href={`mailto:${c.body}`} className="hover:text-[#66fcf1] focus-visible:text-[#66fcf1] focus-visible:outline-none">
                      {c.body}
                    </a>
                  ) : (
                    c.body
                  )}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="form-heading" className="bg-[#0b0c10]">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-[120px] lg:py-20">
          <div>
            <h2 id="form-heading" className="font-display text-3xl font-bold text-white sm:text-4xl">
              Tell us what’s on your mind.
            </h2>
            <p className="mt-[18px] max-w-[440px] text-base text-[#c5c6c7]">
              Whether you need help with a booking, want to ask about an event, or are interested in becoming an organizer, use the form and we’ll route your message to the right team.
            </p>
            <div className="mt-[18px] max-w-[440px] rounded-xl border border-[#2c3644] bg-[#1f2833] p-[18px] text-base text-[#c5c6c7]">
              Aventix Support
            </div>
          </div>
          <ContactForm />
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="bg-[#0b0c10]">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-[120px] lg:py-16">
          <h2 id="faq-heading" className="font-display text-3xl font-bold text-white sm:text-4xl">
            Before you reach out
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {FAQ.map((q) => (
              <li key={q} className="rounded-[14px] border border-[#2c3644] bg-[#1f2833] px-[22px] py-[18px] text-sm font-semibold text-white">
                {q}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
