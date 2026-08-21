'use client';

import React, { useState } from 'react';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { Reveal } from '@/components/marketing/Reveal';
import { Parallax } from '@/components/marketing/Parallax';
import { Mail, Phone, MapPin, MessageCircle, Check } from 'lucide-react';

const contactChannels = [
  {
    icon: Mail,
    title: 'Email',
    detail: 'For anything that is not urgent',
    value: 'support@smartride.ug',
    href: 'mailto:support@smartride.ug',
  },
  {
    icon: Phone,
    title: 'Phone',
    detail: 'Monday to Friday, 8am to 6pm',
    value: '+256 785 710 818',
    href: 'tel:+256785710818',
  },
  {
    icon: MessageCircle,
    title: 'In-app support',
    detail: 'Fastest route for a problem with a live trip',
    value: 'Open the app and tap Help',
    href: null,
  },
  {
    icon: MapPin,
    title: 'Office',
    detail: 'Natural Intellects Corp',
    value: 'Kampala, Uganda',
    href: null,
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch {
      setError(
        'Could not reach our servers. Check your connection, or email support@smartride.ug directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-mkt-border bg-mkt-bg px-4 py-3.5 text-mkt-fg placeholder-mkt-fg-faint transition-colors focus:border-mkt-accent/50 focus:outline-none focus:ring-1 focus:ring-mkt-accent/50';

  return (
    <MarketingShell>
      <MarketingHeader />

      <Section className="pb-12">
        <Reveal>
          <h1 className="text-4xl font-bold leading-tight text-mkt-fg sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-mkt-fg-muted">
            If something went wrong on a trip, in-app support is quickest. For
            everything else, use whichever of these suits you.
          </p>
        </Reveal>
      </Section>

      <Section className="pt-0">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          <Reveal x={-20} y={0} className="rounded-3xl border border-mkt-border bg-mkt-bg-raised p-8">
            <h2 className="mb-6 text-2xl font-bold text-mkt-fg">Send us a message</h2>

            {submitted ? (
              <div className="rounded-xl border border-mkt-accent/20 bg-mkt-accent/10 p-6 text-center">
                <Check className="mx-auto mb-4 h-12 w-12 text-mkt-accent" />
                <h3 className="mb-2 text-xl font-semibold text-mkt-fg">Message sent</h3>
                <p className="text-mkt-fg-muted">
                  It has reached our support inbox. We reply by email, so keep an
                  eye on the address you gave us.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-sm font-semibold text-mkt-accent hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-mkt-fg">
                    Full name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    maxLength={100}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium text-mkt-fg">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    maxLength={200}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="mb-2 block text-sm font-medium text-mkt-fg">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    required
                    maxLength={150}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="mb-2 block text-sm font-medium text-mkt-fg">
                    Message
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    required
                    rows={5}
                    maxLength={4000}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-mkt-accent py-4 font-semibold text-mkt-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? 'Sending...' : 'Send message'}
                </button>
              </form>
            )}
          </Reveal>

          <Parallax speed={12}>
            <Reveal x={20} y={0} delay={0.08}>
              <dl className="divide-y divide-mkt-border border-t border-mkt-border">
                {contactChannels.map((channel) => (
                  <div key={channel.title} className="py-6">
                    <dt className="flex items-center gap-2.5">
                      <channel.icon className="h-4 w-4 shrink-0 text-mkt-accent" />
                      <span className="font-semibold text-mkt-fg">{channel.title}</span>
                    </dt>
                    <dd className="mt-2 pl-[26px]">
                      <p className="mb-1 text-sm text-mkt-fg-faint">{channel.detail}</p>
                      {channel.href ? (
                        <a href={channel.href} className="text-mkt-accent hover:underline">
                          {channel.value}
                        </a>
                      ) : (
                        <p className="text-mkt-fg-muted">{channel.value}</p>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </Parallax>
        </div>
      </Section>

      <MarketingFooter />
    </MarketingShell>
  );
}
