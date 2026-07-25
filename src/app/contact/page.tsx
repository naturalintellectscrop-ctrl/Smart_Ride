'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { MOBILE_APP_CONFIG } from '@/lib/config/mobile-access';
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
    'w-full rounded-xl border border-white/5 bg-[#252530] px-4 py-3.5 text-white placeholder-white/30 transition-colors focus:border-[#00FF88]/50 focus:outline-none focus:ring-1 focus:ring-[#00FF88]/50';

  return (
    <div className="min-h-screen bg-[#0D0D12]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-[#0D0D12]/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo variant="dark" />

            <div className="hidden items-center gap-8 md:flex">
              <Link href="/about" className="text-sm font-medium text-white/70 transition-colors hover:text-white">About</Link>
              <Link href="/help" className="text-sm font-medium text-white/70 transition-colors hover:text-white">Help</Link>
              <Link href="/contact" className="text-sm font-medium text-[#00FF88]">Contact</Link>
              <Link href="/blog" className="text-sm font-medium text-white/70 transition-colors hover:text-white">Blog</Link>
            </div>

            <a
              href={MOBILE_APP_CONFIG.storeLinks.playStore}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-[#00FF88] px-5 py-2.5 text-sm font-semibold text-[#0D0D12] transition-colors hover:bg-[#00e07a]"
            >
              Get the app
            </a>
          </div>
        </div>
      </nav>

      <section className="px-4 pb-12 pt-32 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
            Get in touch
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-white/60">
            If something went wrong on a trip, in-app support is quickest. For
            everything else, use whichever of these suits you.
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/5 bg-[#1A1A1F] p-8">
              <h2 className="mb-6 text-2xl font-bold text-white">Send us a message</h2>

              {submitted ? (
                <div className="rounded-xl border border-[#00FF88]/20 bg-[#00FF88]/10 p-6 text-center">
                  <Check className="mx-auto mb-4 h-12 w-12 text-[#00FF88]" />
                  <h3 className="mb-2 text-xl font-semibold text-white">Message sent</h3>
                  <p className="text-white/60">
                    It has reached our support inbox. We reply by email, so keep an
                    eye on the address you gave us.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-6 text-sm font-semibold text-[#00FF88] hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm font-medium text-white">
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
                    <label htmlFor="email" className="mb-2 block text-sm font-medium text-white">
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
                    <label htmlFor="subject" className="mb-2 block text-sm font-medium text-white">
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
                    <label htmlFor="message" className="mb-2 block text-sm font-medium text-white">
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
                      className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 px-4 py-3 text-sm text-[#F43F5E]"
                    >
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-[#00FF88] py-4 font-semibold text-[#0D0D12] transition-colors hover:bg-[#00e07a] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSubmitting ? 'Sending...' : 'Send message'}
                  </button>
                </form>
              )}
            </div>

            <dl className="divide-y divide-white/10 border-t border-white/10">
              {contactChannels.map((channel) => (
                <div key={channel.title} className="py-6">
                  <dt className="flex items-center gap-2.5">
                    <channel.icon className="h-4 w-4 shrink-0 text-[#00FF88]" />
                    <span className="font-semibold text-white">{channel.title}</span>
                  </dt>
                  <dd className="mt-2 pl-[26px]">
                    <p className="mb-1 text-sm text-white/50">{channel.detail}</p>
                    {channel.href ? (
                      <a href={channel.href} className="text-[#00FF88] hover:underline">
                        {channel.value}
                      </a>
                    ) : (
                      <p className="text-white/70">{channel.value}</p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 bg-[#0A0A0F] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 grid grid-cols-1 gap-12 md:grid-cols-4">
            <div className="col-span-1 md:col-span-2">
              <Logo variant="dark" />
              <p className="mt-6 max-w-md leading-relaxed text-white/50">
                Rides, food, shopping, pharmacy and payments in one app. Built in
                Kampala by Natural Intellects Corp.
              </p>
            </div>

            <div>
              <h4 className="mb-6 font-semibold text-white">Company</h4>
              <ul className="space-y-4">
                <li><Link href="/about" className="text-white/50 transition-colors hover:text-[#00FF88]">About</Link></li>
                <li><Link href="/help" className="text-white/50 transition-colors hover:text-[#00FF88]">Help centre</Link></li>
                <li><Link href="/contact" className="text-white/50 transition-colors hover:text-[#00FF88]">Contact</Link></li>
                <li><Link href="/blog" className="text-white/50 transition-colors hover:text-[#00FF88]">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-6 font-semibold text-white">Contact</h4>
              <ul className="space-y-4">
                <li className="text-white/50">
                  <span className="text-white">Email:</span>{' '}
                  <a href="mailto:support@smartride.ug" className="transition-colors hover:text-[#00FF88]">support@smartride.ug</a>
                </li>
                <li className="text-white/50">
                  <span className="text-white">Phone:</span>{' '}
                  <a href="tel:+256785710818" className="transition-colors hover:text-[#00FF88]">+256 785 710 818</a>
                </li>
                <li className="text-white/50">
                  <span className="text-white">Location:</span> Kampala, Uganda
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8">
            <p className="text-sm text-white/30">
              © {new Date().getFullYear()} Smart Ride, Natural Intellects Corp.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
