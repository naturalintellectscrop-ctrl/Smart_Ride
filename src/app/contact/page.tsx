'use client';

import React, { useState } from 'react';
import { MarketingHeader } from '@/components/marketing/MarketingHeader';
import { MarketingFooter } from '@/components/marketing/MarketingFooter';
import { Section } from '@/components/marketing/Section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

  const fieldClass =
    'border-white/15 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#00D97E] focus-visible:ring-[#00D97E]/30';

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0C0E] text-white">
      <MarketingHeader />

      <Section className="pb-12 pt-20 lg:pt-24">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#00D97E]">
          Contact
        </span>
        <h1 className="mt-5 text-balance font-[family-name:var(--font-plus-jakarta)] text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl">
          Get in touch
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/55">
          If something went wrong on a trip, in-app support is quickest. For
          everything else, use whichever of these suits you.
        </p>
      </Section>

      <Section className="pt-4">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
          <dl className="divide-y divide-white/10 border-t border-white/10 lg:order-2">
            {contactChannels.map((channel) => (
              <div key={channel.title} className="py-6">
                <dt className="flex items-center gap-2.5">
                  <channel.icon className="h-4 w-4 shrink-0 text-[#00D97E]" />
                  <span className="font-semibold text-white">{channel.title}</span>
                </dt>
                <dd className="mt-2 pl-[26px]">
                  <p className="mb-1 text-sm text-white/45">{channel.detail}</p>
                  {channel.href ? (
                    <a href={channel.href} className="text-white transition-colors hover:text-[#00D97E]">
                      {channel.value}
                    </a>
                  ) : (
                    <p className="text-white/70">{channel.value}</p>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="lg:order-1">
            <h2 className="mb-8 text-2xl font-semibold text-white">Send us a message</h2>

            {submitted ? (
              <div className="rounded-2xl border border-white/10 p-8 text-center">
                <Check className="mx-auto mb-4 h-10 w-10 text-[#00D97E]" />
                <h3 className="mb-2 text-xl font-semibold text-white">Message sent</h3>
                <p className="text-white/55">
                  It has reached our support inbox. We reply by email, so keep an
                  eye on the address you gave us.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-sm font-semibold text-[#00D97E] hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-white/70">
                    Full name
                  </label>
                  <Input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    required
                    maxLength={100}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-white/70">
                    Email address
                  </label>
                  <Input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    required
                    maxLength={200}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-white/70">
                    Subject
                  </label>
                  <Input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    required
                    maxLength={150}
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-white/70">
                    Message
                  </label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData((prev) => ({ ...prev, message: e.target.value }))}
                    required
                    rows={5}
                    maxLength={4000}
                    className={fieldClass}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                  >
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-white text-[#0B0C0E] hover:bg-white/90"
                >
                  {isSubmitting ? 'Sending...' : 'Send message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </Section>

      <MarketingFooter />
    </div>
  );
}
