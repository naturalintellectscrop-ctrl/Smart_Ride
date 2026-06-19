'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Bike,
  Car,
  UtensilsCrossed,
  Package,
  ShoppingCart,
  HeartPulse,
  Smartphone,
  Shield,
  Clock,
  Star,
  Zap,
  Users,
  Wallet,
  Siren,
  Menu,
  Download,
  ArrowRight,
  Mail,
  MapPin,
  CheckCircle2,
  Apple,
  Heart,
  Bookmark,
  X,
  Phone,
  Send,
  TrendingUp,
  MapPinned,
  BadgePercent,
  Headphones,
  Compass,
  Lock,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  QrCode,
  ChevronRight,
} from 'lucide-react';

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND = {
  green: '#005f3a', // primary brand green
  neon: '#00FF88', // CTA / highlights
  cyan: '#00FFF3', // secondary highlights
  bg: '#0D0D12',
  bgAlt: '#111827',
  card: '#1A1A1F',
  cardAlt: '#252530',
  red: '#F43F5E',
};

// ─── Animation helpers ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.6, ease: 'easeOut' as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  image: string;
  likes: number;
}

// ─── Data ────────────────────────────────────────────────────────────────────
const navLinks = [
  { label: 'Services', href: '#services' },
  { label: 'Why Smart Ride', href: '#why' },
  { label: 'Blogs', href: '#blogs' },
  { label: 'Newsletter', href: '#newsletter' },
  { label: 'Contact', href: '#contact' },
];

const services = [
  {
    icon: Bike,
    title: 'Boda Ride',
    description:
      'Quick & affordable boda boda rides across Kampala. Beat the traffic with vetted riders near you.',
  },
  {
    icon: Car,
    title: 'Car Ride',
    description:
      'Comfortable car rides for longer trips, airport runs, and group travel. Upfront pricing, no haggling.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Food Delivery',
    description:
      'Order from your favourite restaurants — Cafe Java, Ugandan Kitchen, and more. Hot meals delivered fast.',
  },
  {
    icon: Package,
    title: 'Package Delivery',
    description:
      'Send documents and parcels across town. Track your courier in real time from pickup to drop-off.',
  },
  {
    icon: ShoppingCart,
    title: 'Shopping & Groceries',
    description:
      'Groceries, matooke, and essentials from local stores. Shop from home, get it delivered fresh the same day.',
  },
  {
    icon: HeartPulse,
    title: 'Health & Pharmacy',
    description:
      'Pharmacy and health products delivered discreetly. Order prescriptions and OTC medicine anytime.',
  },
  {
    icon: Wallet,
    title: 'Smart Wallet',
    description:
      'Top up via MTN MoMo or Airtel Money. Pay for rides, food, and shopping with one tap — cashless & secure.',
  },
  {
    icon: Siren,
    title: 'SOS Safety',
    description:
      'One-tap SOS alerts share your live location with trusted contacts and Smart Ride support — always on.',
  },
];

const benefits = [
  {
    icon: Shield,
    title: 'Safety First',
    description:
      'Verified drivers, real-time trip tracking, in-app SOS, and 24/7 support keep every journey protected.',
  },
  {
    icon: BadgePercent,
    title: 'Transparent Pricing',
    description:
      'Know your fare before you ride. No hidden fees, no surprises — pay with cash, MTN MoMo, or Airtel Money.',
  },
  {
    icon: Zap,
    title: 'Fast Matching',
    description:
      'Average pickup under 5 minutes in Kampala. A vast rider network means a ride is always nearby.',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description:
      'Our Uganda-based support team is available round the clock via in-app chat, email, and phone.',
  },
  {
    icon: Compass,
    title: 'Local Knowledge',
    description:
      'Built in Uganda, for Uganda. Our drivers know the shortcuts, the stages, and the city like locals do.',
  },
  {
    icon: Lock,
    title: 'Secure Payments',
    description:
      'Bank-grade encryption protects your wallet and card. Every transaction is logged and refundable.',
  },
];

const stats = [
  { icon: Car, value: 1000000, suffix: '+', label: 'Rides Completed' },
  { icon: Users, value: 12000, suffix: '+', label: 'Active Riders' },
  { icon: MapPinned, value: 50, suffix: '+', label: 'Cities & Towns' },
  { icon: Star, value: 4.8, suffix: '', label: 'Customer Rating', isFloat: true },
];

// ─── Blog Posts (real Ugandan-context content) ───────────────────────────────
const blogPosts: BlogPost[] = [
  {
    id: 'boda-safety-kampala',
    title: 'How Smart Ride is making boda bodas safer in Kampala',
    excerpt:
      'From verified riders to live trip tracking and one-tap SOS, here is how we are rethinking boda safety from the ground up.',
    content:
      'Boda bodas are the lifeblood of Kampala. They weave through traffic, deliver goods, and get over a million Ugandans to work every morning. But for years, safety on a boda has been a gamble — unverified riders, no helmets, no way to share your trip with family.\n\nAt Smart Ride, we believe that getting across town should never feel risky. That is why every rider on our platform goes through a multi-step onboarding: national ID verification, a riding skills test, a background check, and a customer-service orientation. Only about 1 in 3 applicants makes it through.\n\nOnce a rider is on the platform, every trip is tracked end-to-end. You can share your live location with up to three trusted contacts from inside the app, and our 24/7 support team monitors trips flagged for route deviations or unexpected stops. The SOS button — built into every ride screen — instantly connects you to our safety desk and shares your coordinates.\n\nWe also provide helmets to every new rider partner and run quarterly safety refresher courses in partnership with local riding associations. The results speak for themselves: incidents on Smart Ride trips are down 60% year-over-year, and our average rider rating sits at 4.8 out of 5.\n\nThis is just the beginning. Over the next year we are rolling out in-ride speed monitoring, automatic crash detection, and a community safety council made up of passengers and riders. Safer bodas are not a luxury — they are the baseline.',
    category: 'Safety',
    author: 'Smart Ride Safety Team',
    authorRole: 'Smart Ride Team',
    date: '2026-02-18',
    readTime: '5 min read',
    image: '/images/boda-ride.png',
    likes: 248,
  },
  {
    id: 'smart-ride-wallet-explained',
    title: 'The future of mobile money: Smart Ride Wallet explained',
    excerpt:
      'Top up with MTN MoMo or Airtel Money, pay for rides and food with one tap, and earn cashback. Here is how the Smart Ride Wallet works.',
    content:
      'Mobile money changed Uganda. From paying school fees to settling a boda fare, MTN MoMo and Airtel Money are how Ugandans move money. Smart Ride Wallet builds on that foundation — it is a single balance that powers every service inside the app.\n\nGetting started is simple. Open the Wallet tab, tap "Top up", and choose MTN MoMo or Airtel Money. Enter the amount, approve the STK push on your phone, and your balance updates instantly. There are no top-up fees, and the money stays in your wallet until you spend it.\n\nFrom there, your wallet becomes your universal payment method. Hail a boda — pay from your wallet. Order lunch from Cafe Java — pay from your wallet. Send a package, buy groceries, refill a prescription — all from one balance. Drivers and merchants receive their share instantly, with no settlement delays.\n\nThe Wallet also rewards you. Every ride paid from your wallet earns 2% cashback, credited weekly. Refer a friend and you both get UGX 5,000 once they take their first trip. During promotions we have offered double cashback on off-peak rides to help ease Kampala\'s rush-hour congestion.\n\nSecurity is built in. Every payment requires your Smart Ride PIN or biometric confirmation, every transaction is logged in your activity feed, and our fraud team monitors for unusual patterns around the clock. If something goes wrong, refunds land back in your wallet within 24 hours.\n\nWe are not trying to replace MTN MoMo or Airtel Money — we are building on top of them to make everyday payments in Uganda faster, safer, and a little more rewarding.',
    category: 'Fintech',
    author: 'Smart Ride Wallet Team',
    authorRole: 'Smart Ride Team',
    date: '2026-02-10',
    readTime: '6 min read',
    image: '',
    likes: 312,
  },
  {
    id: 'supporting-local-drivers',
    title: '5 ways Smart Ride supports local drivers',
    excerpt:
      'A ride-hailing app is only as good as its riders. Here are five concrete ways we invest in the people who power Smart Ride.',
    content:
      'When you tap "Request boda", a real person — a Ugandan with a family, a dream, and a motorbike — answers. Smart Ride does not work without them. So we have built the platform around their success, not just ours.\n\nFirst, fair earnings. We cap our commission at 15%, well below the industry standard. Riders keep the rest, and they see exactly what each trip pays before they accept it. No opaque algorithms, no surprise deductions.\n\nSecond, fast payouts. Riders can cash out to MTN MoMo or Airtel Money instantly, 24/7, for a flat UGX 500 fee. There is no minimum balance and no weekly waiting period. Money earned today is money in their pocket tonight.\n\nThird, rider financing. Through partnerships with local SACCOs, qualified riders can access bike financing at below-market rates, with repayments deducted daily from their earnings. Over 800 riders have purchased their own bikes through this program.\n\nFourth, insurance. Every active rider is covered by an accident insurance policy that pays out for medical bills, lost income, and — in the worst case — a benefit to their family. This is funded by Smart Ride, not the rider.\n\nFifth, growth. Our top riders earn over UGX 1.2 million per month, and we run free training on customer service, route optimisation, and financial literacy every quarter at our Kampala, Entebbe, and Jinja hubs.\n\nWhen riders win, passengers win. That is the whole idea.',
    category: 'Drivers',
    author: 'Smart Ride Driver Team',
    authorRole: 'Smart Ride Team',
    date: '2026-02-02',
    readTime: '4 min read',
    image: '',
    likes: 197,
  },
  {
    id: 'sos-safety-every-ride',
    title: 'Why we built SOS safety into every ride',
    excerpt:
      'A single button that shares your live location with trusted contacts and our safety desk. The story behind Smart Ride\'s SOS feature.',
    content:
      'The idea for Smart Ride\'s SOS button came from a late-night conversation with a passenger in Wandegeya. She had taken a boda home after work and felt unsafe halfway through the trip — the rider had taken an unfamiliar route. She had no way to alert anyone without escalating the situation.\n\nThat conversation became a feature. Today, every Smart Ride ride — boda, car, or delivery — has a red SOS button on the live tracking screen. One tap does three things instantly: it shares your live GPS coordinates with up to three pre-selected emergency contacts, it alerts our 24/7 safety desk with your trip details, and it begins an audio recording on your phone that is uploaded securely to our servers.\n\nOur safety desk is staffed round the clock by trained Ugandans who can call you, call the rider, or escalate to the nearest police station. In genuine emergencies we work directly with the Uganda Police Force to share trip data and rider information.\n\nThe SOS feature is designed to be discreet. It does not flash a warning on the rider\'s screen, it does not make a sound, and it works even if your phone is on silent. You can trigger it from the lock screen using a configurable triple-press of the power button.\n\nSince launching SOS, we have responded to over 12,000 activations. The vast majority were resolved with a quick check-in call. But in a handful of cases, the feature genuinely saved lives — including a passenger in Mukono whose contact arrived within minutes after the rider deviated from the route.\n\nSafety is not a feature you monetise. It is the price of being allowed to operate. That is why SOS will always be free, always be on, and always be one tap away.',
    category: 'Product',
    author: 'Smart Ride Safety Team',
    authorRole: 'Smart Ride Team',
    date: '2026-01-22',
    readTime: '5 min read',
    image: '',
    likes: 421,
  },
  {
    id: 'marketplace-groceries-pharmacy',
    title: 'Smart Ride marketplace: From groceries to pharmacy, delivered',
    excerpt:
      'One app, hundreds of vendors. How Smart Ride Marketplace connects you to groceries, restaurants, and pharmacy items in minutes.',
    content:
      'Smart Ride started as a ride-hailing app. But the moment we had a network of riders moving across Kampala every minute of the day, we realised the same network could carry far more than people. It could carry food, groceries, medicine, parcels — anything that fits on a boda.\n\nToday, Smart Ride Marketplace is a single tab in the app that connects you to over 600 vendors across Kampala, Entebbe, and Jinja. That includes restaurants like Cafe Java and Ugandan Kitchen, supermarkets, fresh produce markets, pharmacies, and specialty stores for electronics and gifts.\n\nThe experience is consistent across categories. You browse, you add to cart, you see an upfront delivery fee based on distance, and you check out with your Smart Ride Wallet, MTN MoMo, Airtel Money, or cash on delivery. A rider is matched automatically — usually within 5 minutes — and you track them on the map from the store to your door.\n\nFor pharmacy orders, we have built a discreet mode: the delivery description shows only "Personal items" so your neighbours do not see what you ordered. Prescription medicines require a photo of your prescription, which our partner pharmacists verify before dispatch.\n\nFor groceries, we partnered with fresh produce markets in Nakawa, Nakasero, and Owino to bring wholesale prices to households. A bunch of matooke that costs UGX 25,000 at the local kiosk often lands at your door for UGX 18,000 — including delivery.\n\nEvery vendor on the marketplace is vetted, rated, and insured. If something is wrong with your order — a missing item, spoiled produce, the wrong prescription — our support team refunds you within 24 hours. No back-and-forth with the vendor.\n\nThe marketplace is how Smart Ride becomes the everyday app for Uganda. Not just for getting somewhere, but for getting anything.',
    category: 'Product',
    author: 'Smart Ride Marketplace Team',
    authorRole: 'Smart Ride Team',
    date: '2026-01-14',
    readTime: '6 min read',
    image: '/images/food-hero.png',
    likes: 286,
  },
  {
    id: 'expanding-beyond-kampala',
    title: 'Expanding beyond Kampala: Our journey across Uganda',
    excerpt:
      'From Kampala to Jinja, Mbale, Mbarara, and Gulu — the story of how Smart Ride is growing to serve every major Ugandan town.',
    content:
      'Smart Ride launched in Kampala in 2024 with fifty riders and a single office in Kamwokya. Two years later, we are live in twelve cities and towns across Uganda — and we are just getting started.\n\nExpansion is not just about putting a pin on a map. Each new city is a months-long process: we recruit local riders, partner with restaurants and pharmacies, set up a local support presence, and tune our pricing to local realities. A boda ride in Mbale cannot cost the same as one in Kololo.\n\nOur second city was Entebbe, an obvious choice given the airport traffic. Then Jinja, where tourism and the Source of the Nile brought steady demand. Mukono followed, then Mbarara — our first western Uganda city — and Mbale in the east. In 2025 we launched in Gulu and Lira, our first northern Uganda cities, working closely with local boda associations to onboard riders who already knew every shortcut.\n\nThe challenges of expansion are real. In smaller towns, demand is lower and rider earnings are harder to sustain. We solve this by combining categories — a rider in Mbale might do three passenger trips, two food deliveries, and one parcel pickup in a single day, smoothing out their income.\n\nConnectivity is another hurdle. We rebuilt our app to work on 2G networks and to cache trip data offline, so a rider in a dead zone in Kisoro can still complete a delivery once they get back to signal. We also partnered with MTN and Airtel to offer zero-rated data on the Smart Ride app for riders on selected bundles.\n\nBy the end of 2026, we plan to be live in 25 cities, including Hoima, Fort Portal, Masaka, and Soroti. Every city we enter, we hire locally — our support team now speaks Luganda, English, Runyankole, Luo, and Ateso.\n\nSmart Ride is not just a Kampala app. It is a Uganda app — built, staffed, and grown by Ugandans, for every corner of this country.',
    category: 'Community',
    author: 'Smart Ride Expansion Team',
    authorRole: 'Smart Ride Team',
    date: '2026-01-05',
    readTime: '5 min read',
    image: '/images/kampala-hero.png',
    likes: 354,
  },
];

const footerLinks = {
  company: [
    { label: 'Services', href: '#services' },
    { label: 'Why Smart Ride', href: '#why' },
    { label: 'Blogs', href: '#blogs' },
    { label: 'Newsletter', href: '#newsletter' },
    { label: 'Contact', href: '#contact' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Delete Account', href: '/delete-account' },
  ],
};

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      className="mx-auto max-w-2xl text-center"
    >
      <motion.div variants={fadeUp}>
        <Badge
          variant="outline"
          className="mb-4 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
        >
          {eyebrow}
        </Badge>
      </motion.div>
      <motion.h2
        variants={fadeUp}
        className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          variants={fadeUp}
          className="mt-4 text-base text-white/60 sm:text-lg"
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}

// ─── Animated counter (for stats) ────────────────────────────────────────────
function AnimatedCounter({
  value,
  suffix,
  isFloat = false,
}: {
  value: number;
  suffix: string;
  isFloat?: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const duration = 1600;
            const start = performance.now();
            const animate = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setDisplay(value * eased);
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          }
        });
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  const formatted = isFloat
    ? display.toFixed(1)
    : Math.round(display).toLocaleString('en-US');

  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}

// ─── localStorage helpers ────────────────────────────────────────────────────
const LIKES_KEY = 'smartride_blog_likes';
const SAVED_KEY = 'smartride_blog_saved';
const NEWSLETTER_KEY = 'smartride_newsletter_emails';

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

// ─── Blog Modal (with scrolling progress bar) ────────────────────────────────
function BlogModal({
  post,
  liked,
  saved,
  onToggleLike,
  onToggleSave,
  onClose,
}: {
  post: BlogPost | null;
  liked: boolean;
  saved: boolean;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Reset scroll + progress when opening a new post
  useEffect(() => {
    if (post) {
      setProgress(0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [post]);

  // Escape to close
  useEffect(() => {
    if (!post) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [post, onClose]);

  const handleScroll = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const max = node.scrollHeight - node.clientHeight;
    const pct = max > 0 ? (node.scrollTop / max) * 100 : 0;
    setProgress(Math.min(100, Math.max(0, pct)));
  }, []);

  if (!post) return null;

  const paragraphs = post.content.split('\n\n');

  return (
    <Dialog open={!!post} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl overflow-hidden border-white/10 bg-[#1A1A1F] p-0 text-white sm:max-w-2xl"
        showCloseButton={false}
      >
        {/* Scrolling progress bar — the "scrolling bar" requirement */}
        <div className="absolute left-0 right-0 top-0 z-20 h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-[#00FF88] to-[#00FFF3] transition-[width] duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close blog post"
          className="absolute right-3 top-4 z-30 rounded-full bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="size-4" />
        </button>

        <DialogHeader className="sr-only">
          <DialogTitle>{post.title}</DialogTitle>
          <DialogDescription>{post.excerpt}</DialogDescription>
        </DialogHeader>

        {/* Hero image (or gradient) */}
        {post.image ? (
          <div className="relative h-48 w-full overflow-hidden sm:h-56">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 672px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1F] via-[#1A1A1F]/30 to-transparent" />
          </div>
        ) : (
          <div className="relative h-32 w-full bg-gradient-to-br from-[#005f3a] via-[#1A1A1F] to-[#111827]" />
        )}

        {/* Scrollable content area with custom scrollbar */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="blog-modal-scroll max-h-[70vh] overflow-y-auto px-6 pb-8"
        >
          <div className="pt-4">
            <Badge
              variant="outline"
              className="mb-3 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88]"
            >
              {post.category}
            </Badge>
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
              {post.title}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/50">
              <span className="font-medium text-white/70">{post.author}</span>
              <span aria-hidden>·</span>
              <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span aria-hidden>·</span>
              <span>{post.readTime}</span>
            </div>
          </div>

          {/* Body */}
          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-white/80">
                {p}
              </p>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            <Button
              type="button"
              variant={liked ? 'default' : 'outline'}
              onClick={() => onToggleLike(post.id)}
              aria-pressed={liked}
              aria-label={liked ? 'Unlike this blog post' : 'Like this blog post'}
              className={
                liked
                  ? 'border-[#F43F5E] bg-[#F43F5E]/15 text-[#F43F5E] hover:bg-[#F43F5E]/25'
                  : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
              }
            >
              <Heart className={`size-4 ${liked ? 'fill-[#F43F5E]' : ''}`} />
              {liked ? 'Liked' : 'Like'}
              <span className="ml-1 tabular-nums">{post.likes + (liked ? 1 : 0)}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onToggleSave(post.id)}
              aria-pressed={saved}
              aria-label={saved ? 'Remove from saved blogs' : 'Save this blog post'}
              className={
                saved
                  ? 'border-[#00FF88]/50 bg-[#00FF88]/15 text-[#00FF88] hover:bg-[#00FF88]/25'
                  : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
              }
            >
              <Bookmark className={`size-4 ${saved ? 'fill-[#00FF88]' : ''}`} />
              {saved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { toast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Blog state
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [likedBlogs, setLikedBlogs] = useState<Record<string, boolean>>({});
  const [savedBlogs, setSavedBlogs] = useState<string[]>([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscriberCount, setSubscriberCount] = useState(1200);

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');

  // ─── Load persisted state on mount ─────────────────────────────────────────
  useEffect(() => {
    setLikedBlogs(readJSON<Record<string, boolean>>(LIKES_KEY, {}));
    setSavedBlogs(readJSON<string[]>(SAVED_KEY, []));
    const stored = readJSON<string[]>(NEWSLETTER_KEY, []);
    setSubscriberCount(Math.max(1200, stored.length));
  }, []);

  // ─── Like / Save handlers ──────────────────────────────────────────────────
  const toggleLike = useCallback((id: string) => {
    setLikedBlogs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeJSON(LIKES_KEY, next);
      return next;
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedBlogs((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      writeJSON(SAVED_KEY, next);
      return next;
    });
  }, []);

  // ─── Newsletter submit ─────────────────────────────────────────────────────
  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newsletterEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    const existing = readJSON<string[]>(NEWSLETTER_KEY, []);
    if (existing.includes(email)) {
      toast({
        title: 'Already subscribed',
        description: "You're already on the list — thanks for being a fan!",
      });
      return;
    }
    const next = [...existing, email];
    writeJSON(NEWSLETTER_KEY, next);
    setSubscriberCount(Math.max(1200, next.length));
    setNewsletterEmail('');
    toast({
      title: 'Thanks for subscribing!',
      description: 'You will start receiving Smart Ride updates soon.',
    });
  };

  // ─── Contact form submit (non-functional placeholder) ──────────────────────
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in your name, email, and message.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Message sent',
      description: 'Thanks for reaching out — our team will reply within 24 hours.',
    });
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  // ─── Filtered blog list ────────────────────────────────────────────────────
  const visibleBlogs = showSavedOnly
    ? blogPosts.filter((b) => savedBlogs.includes(b.id))
    : blogPosts;

  return (
    <div className="flex min-h-screen flex-col bg-[#0D0D12] font-sans text-white">
      {/* ─── Sticky Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0D0D12]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-lg shadow-[#00FF88]/20">
              <Image
                src="/images/smart-ride-logo.png"
                alt="Smart Ride Logo"
                fill
                className="object-cover"
                priority
                sizes="36px"
              />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Smart Ride
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white/70 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <a href="#download">
              <Button
                size="default"
                className="bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
              >
                <Download className="size-4" />
                Get the App
              </Button>
            </a>
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white md:hidden"
                aria-label="Open menu"
              >
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[280px] border-white/10 bg-[#0D0D12] text-white"
            >
              <SheetHeader>
                <SheetTitle className="text-left text-white">Menu</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <a
                      href={link.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      {link.label}
                    </a>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <a href="#download" className="mt-3">
                    <Button className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a]">
                      <Download className="size-4" />
                      Get the App
                    </Button>
                  </a>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pb-28 lg:pt-32"
      >
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-[#00FF88] opacity-10 blur-[128px]" />
          <div className="absolute right-1/4 top-1/3 h-80 w-80 rounded-full bg-[#005f3a] opacity-25 blur-[120px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0D0D12]" />
        </div>

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2"
        >
          {/* Left: copy */}
          <div className="text-center lg:text-left">
            <motion.div variants={fadeUp}>
              <Badge
                variant="outline"
                className="mb-5 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
              >
                <MapPin className="size-3" />
                Now live across Uganda
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
            >
              Move, eat, shop & pay —{' '}
              <span className="bg-gradient-to-r from-[#00FF88] to-[#00FFF3] bg-clip-text text-transparent">
                all in one app
              </span>{' '}
              built for Uganda
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-xl text-base text-white/70 sm:text-lg lg:mx-0"
            >
              Smart Ride brings boda rides, car rides, food delivery, groceries,
              pharmacy, a mobile wallet, and one-tap SOS safety together —
              powered by MTN MoMo and Airtel Money, built in Kampala.
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start"
            >
              <a href="#download" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
                >
                  <Download className="size-5" />
                  Get the App
                </Button>
              </a>
              <a href="#services" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  Explore Services
                  <ArrowRight className="size-5" />
                </Button>
              </a>
            </motion.div>
            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-white/60 lg:justify-start"
            >
              <div className="flex items-center gap-1.5">
                <div className="flex">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star
                      key={i}
                      className="size-4 fill-[#00FF88] text-[#00FF88]"
                    />
                  ))}
                </div>
                <span>4.8 / 5 rating</span>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <Users className="size-4 text-[#00FF88]" />
                <span>12K+ active riders</span>
              </div>
              <div className="hidden items-center gap-1.5 sm:flex">
                <Shield className="size-4 text-[#00FF88]" />
                <span>SOS in every ride</span>
              </div>
            </motion.div>
          </div>

          {/* Right: hero visual */}
          <motion.div variants={scaleIn} className="relative">
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#00FF88]/30 via-[#005f3a]/20 to-transparent blur-2xl" />
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="relative h-[420px] w-[210px] rounded-[2.5rem] border-4 border-white/10 bg-[#111827] shadow-2xl shadow-[#00FF88]/20">
                  <div className="absolute left-1/2 top-3 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/20" />
                  <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl shadow-lg shadow-[#00FF88]/30">
                      <Image
                        src="/images/smart-ride-logo.png"
                        alt="Smart Ride"
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <p className="text-base font-bold text-white">Smart Ride</p>
                    <p className="text-center text-xs text-white/50">
                      Rides · Food · Shop · Pharmacy · Wallet · SOS
                    </p>
                    <div className="grid w-full grid-cols-3 gap-2">
                      {[
                        { icon: Bike, label: 'Ride' },
                        { icon: UtensilsCrossed, label: 'Food' },
                        { icon: ShoppingCart, label: 'Shop' },
                        { icon: HeartPulse, label: 'Meds' },
                        { icon: Wallet, label: 'Wallet' },
                        { icon: Siren, label: 'SOS' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="flex flex-col items-center gap-1 rounded-lg bg-white/5 py-2"
                        >
                          <item.icon className="size-4 text-[#00FF88]" />
                          <span className="text-[10px] text-white/70">
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {[
            { label: 'MTN MoMo', icon: Wallet },
            { label: 'Airtel Money', icon: Wallet },
            { label: 'Verified Riders', icon: Shield },
            { label: '24/7 Support', icon: Clock },
          ].map((b) => (
            <motion.div
              key={b.label}
              variants={fadeUp}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center"
            >
              <b.icon className="size-4 text-[#00FF88]" />
              <span className="text-xs font-medium text-white/70 sm:text-sm">
                {b.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Services ──────────────────────────────────────────────────────── */}
      <section id="services" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="What we offer"
            title={<>One app. <span className="text-[#00FF88]">Eight services.</span></>}
            subtitle="Everything you need to move, eat, shop, and pay — built for Uganda, delivered by riders you can trust."
          />

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {services.map((s) => (
              <motion.div
                key={s.title}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1F] p-6 transition-all hover:-translate-y-1 hover:border-[#00FF88]/30 hover:shadow-lg hover:shadow-[#00FF88]/10"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#00FF88]/10 text-[#00FF88] transition-colors group-hover:bg-[#00FF88]/20">
                  <s.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {s.description}
                </p>
                <a
                  href="#download"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#00FF88] transition-colors hover:text-[#00FFF3]"
                >
                  Learn more
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </a>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Why Smart Ride ────────────────────────────────────────────────── */}
      <section id="why" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Why Smart Ride"
            title={<>Built different. <span className="text-[#00FF88]">Built for Uganda.</span></>}
            subtitle="We sweat the details that matter — safety, fairness, speed, and local knowledge — so every trip just works."
          />

          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {benefits.map((b) => (
              <motion.div
                key={b.title}
                variants={fadeUp}
                className="rounded-2xl border border-white/10 bg-[#1A1A1F] p-6"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#00FF88]/10 text-[#00FF88]">
                  <b.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold text-white">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {b.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-gradient-to-r from-[#005f3a]/20 via-[#0D0D12] to-[#111827] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="text-center"
            >
              <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#00FF88]/10 text-[#00FF88]">
                <s.icon className="size-5" />
              </div>
              <div className="text-3xl font-bold text-white sm:text-4xl">
                <AnimatedCounter value={s.value} suffix={s.suffix} isFloat={s.isFloat} />
              </div>
              <div className="mt-1 text-xs text-white/60 sm:text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Blogs ─────────────────────────────────────────────────────────── */}
      <section id="blogs" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="From the Blog"
            title={<>Blogs &amp; <span className="text-[#00FF88]">insights</span></>}
            subtitle="Stories, updates, and insights from Smart Ride — safety, fintech, drivers, and our journey across Uganda."
          />

          {/* Filter toggle: Saved Blogs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant={showSavedOnly ? 'default' : 'outline'}
              onClick={() => setShowSavedOnly((v) => !v)}
              aria-pressed={showSavedOnly}
              className={
                showSavedOnly
                  ? 'border-[#00FF88] bg-[#00FF88]/15 text-[#00FF88] hover:bg-[#00FF88]/25'
                  : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
              }
            >
              <Bookmark className={`size-4 ${showSavedOnly ? 'fill-[#00FF88]' : ''}`} />
              {showSavedOnly ? 'Showing Saved Blogs' : 'Show Saved Blogs'}
              {savedBlogs.length > 0 && (
                <span className="ml-1 rounded-full bg-[#00FF88]/20 px-2 py-0.5 text-xs tabular-nums">
                  {savedBlogs.length}
                </span>
              )}
            </Button>
          </div>

          {/* Blog grid */}
          {visibleBlogs.length === 0 ? (
            <div className="mt-12 rounded-2xl border border-dashed border-white/15 bg-white/5 p-12 text-center">
              <Bookmark className="mx-auto mb-3 size-8 text-white/30" />
              <p className="text-white/60">
                No saved blogs yet. Tap the bookmark on any post to save it for later.
              </p>
            </div>
          ) : (
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {visibleBlogs.map((post) => {
                const liked = !!likedBlogs[post.id];
                const saved = savedBlogs.includes(post.id);
                return (
                  <motion.article
                    key={post.id}
                    variants={fadeUp}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1A1A1F] transition-all hover:-translate-y-1 hover:border-[#00FF88]/30 hover:shadow-lg hover:shadow-[#00FF88]/10"
                  >
                    {/* Image / gradient */}
                    <div className="relative h-44 w-full overflow-hidden">
                      {post.image ? (
                        <Image
                          src={post.image}
                          alt={post.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-[#005f3a] via-[#1A1A1F] to-[#111827]" />
                      )}
                      <div className="absolute left-3 top-3">
                        <Badge
                          variant="outline"
                          className="border-[#00FF88]/40 bg-[#0D0D12]/80 text-[#00FF88] backdrop-blur"
                        >
                          {post.category}
                        </Badge>
                      </div>
                      {/* Save button on card */}
                      <button
                        type="button"
                        onClick={() => toggleSave(post.id)}
                        aria-pressed={saved}
                        aria-label={saved ? 'Remove from saved blogs' : 'Save this blog post'}
                        className="absolute right-3 top-3 rounded-full bg-[#0D0D12]/80 p-2 text-white/80 backdrop-blur transition-colors hover:bg-[#0D0D12]"
                      >
                        <Bookmark
                          className={`size-4 ${saved ? 'fill-[#00FF88] text-[#00FF88]' : 'text-white'}`}
                        />
                      </button>
                    </div>

                    {/* Body */}
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-semibold leading-snug text-white">
                        {post.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm text-white/60">
                        {post.excerpt}
                      </p>

                      <div className="mt-3 flex items-center gap-2 text-xs text-white/40">
                        <span>{post.author}</span>
                        <span aria-hidden>·</span>
                        <span>{new Date(post.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        <span aria-hidden>·</span>
                        <span>{post.readTime}</span>
                      </div>

                      {/* Footer actions */}
                      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                        <button
                          type="button"
                          onClick={() => toggleLike(post.id)}
                          aria-pressed={liked}
                          aria-label={liked ? 'Unlike this blog post' : 'Like this blog post'}
                          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-[#F43F5E]"
                        >
                          <Heart
                            className={`size-4 ${liked ? 'fill-[#F43F5E] text-[#F43F5E]' : 'text-white/60'}`}
                          />
                          <span className={`tabular-nums ${liked ? 'text-[#F43F5E]' : 'text-white/60'}`}>
                            {post.likes + (liked ? 1 : 0)}
                          </span>
                        </button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedBlog(post)}
                          className="text-[#00FF88] hover:bg-[#00FF88]/10 hover:text-[#00FFF3]"
                        >
                          Read more
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Blog modal with scrolling progress bar */}
        <BlogModal
          post={selectedBlog}
          liked={selectedBlog ? !!likedBlogs[selectedBlog.id] : false}
          saved={selectedBlog ? savedBlogs.includes(selectedBlog.id) : false}
          onToggleLike={toggleLike}
          onToggleSave={toggleSave}
          onClose={() => setSelectedBlog(null)}
        />
      </section>

      {/* ─── Newsletter ────────────────────────────────────────────────────── */}
      <section id="newsletter" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="relative overflow-hidden rounded-3xl border border-[#00FF88]/20 bg-[#1A1A1F] p-8 text-center sm:p-12"
          >
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-[#00FF88] opacity-15 blur-[100px]" />

            <motion.div variants={fadeUp}>
              <div className="mx-auto mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00FF88]/10 text-[#00FF88]">
                <Mail className="size-7" />
              </div>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Join our Newsletter
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-base text-white/60 sm:text-lg">
              Get the latest Smart Ride updates, safety tips, and exclusive
              offers in your inbox.
            </motion.p>

            <motion.form
              variants={fadeUp}
              onSubmit={handleNewsletterSubmit}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <Input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
              />
              <Button
                type="submit"
                className="bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
              >
                <Send className="size-4" />
                Subscribe
              </Button>
            </motion.form>

            <motion.p variants={fadeUp} className="mt-4 text-sm text-white/50">
              Join{' '}
              <span className="font-semibold text-[#00FF88] tabular-nums">
                {subscriberCount.toLocaleString('en-US')}
              </span>{' '}
              subscribers · We respect your privacy. Unsubscribe at any time.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ─── Download / CTA ────────────────────────────────────────────────── */}
      <section id="download" className="px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
            >
              <motion.div variants={fadeUp}>
                <Badge
                  variant="outline"
                  className="mb-4 border-[#00FF88]/40 bg-[#00FF88]/10 text-[#00FF88] hover:bg-[#00FF88]/15"
                >
                  <Download className="size-3" />
                  Get the App
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
                Download Smart Ride and{' '}
                <span className="bg-gradient-to-r from-[#00FF88] to-[#00FFF3] bg-clip-text text-transparent">
                  move smarter today
                </span>
              </motion.h2>
              <motion.p variants={fadeUp} className="mt-4 text-base text-white/70 sm:text-lg">
                Free to download. Available on Android and iOS. Top up with MTN
                MoMo or Airtel Money and your first ride is on us.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
                  aria-label="Download on Google Play"
                >
                  <Smartphone className="size-5" />
                  Google Play
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                  aria-label="Download on the App Store"
                >
                  <Apple className="size-5" />
                  App Store
                </Button>
              </motion.div>

              <motion.ul variants={fadeUp} className="mt-8 grid gap-2 text-sm text-white/60">
                {[
                  'Free first ride when you sign up',
                  'Top up instantly with MTN MoMo or Airtel Money',
                  'SOS safety built into every trip',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#00FF88]" />
                    {item}
                  </li>
                ))}
              </motion.ul>
            </motion.div>

            {/* QR card */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              className="flex justify-center lg:justify-end"
            >
              <div className="rounded-3xl border border-white/10 bg-[#1A1A1F] p-8 text-center">
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-2xl border border-dashed border-[#00FF88]/30 bg-white/5">
                  <QrCode className="size-24 text-[#00FF88]" aria-hidden />
                </div>
                <p className="mt-4 text-sm font-medium text-white">
                  Scan to download
                </p>
                <p className="mt-1 text-xs text-white/50">
                  Point your phone camera here
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Contact ───────────────────────────────────────────────────────── */}
      <section id="contact" className="bg-[#111827] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Get in touch"
            title={<>Talk to <span className="text-[#00FF88]">the team</span></>}
            subtitle="Questions, partnerships, press, or feedback — we would love to hear from you."
          />

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {/* Contact info */}
            <motion.div
              variants={stagger}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="space-y-4"
            >
              {[
                { icon: Mail, label: 'Email', value: 'hello@smartride.ug', href: 'mailto:hello@smartride.ug' },
                { icon: Phone, label: 'Phone', value: '+256 700 000 000', href: 'tel:+256700000000' },
                { icon: MapPin, label: 'Office', value: 'Kampala, Uganda', href: null },
                { icon: Clock, label: 'Support hours', value: '24/7 — always on', href: null },
              ].map((c) => (
                <motion.div
                  key={c.label}
                  variants={fadeUp}
                  className="flex items-start gap-4 rounded-2xl border border-white/10 bg-[#1A1A1F] p-5"
                >
                  <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#00FF88]/10 text-[#00FF88]">
                    <c.icon className="size-5" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-white/40">
                      {c.label}
                    </div>
                    {c.href ? (
                      <a
                        href={c.href}
                        className="text-base font-medium text-white transition-colors hover:text-[#00FF88]"
                      >
                        {c.value}
                      </a>
                    ) : (
                      <div className="text-base font-medium text-white">
                        {c.value}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Socials */}
              <motion.div variants={fadeUp} className="flex items-center gap-3 pt-2">
                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label="Smart Ride social media"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-[#00FF88]/30 hover:text-[#00FF88]"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </motion.div>
            </motion.div>

            {/* Contact form */}
            <motion.div
              variants={scaleIn}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="rounded-2xl border border-white/10 bg-[#1A1A1F] p-6 sm:p-8"
            >
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-white/80">
                    Name
                  </label>
                  <Input
                    id="contact-name"
                    type="text"
                    autoComplete="name"
                    placeholder="Your name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-white/80">
                    Email
                  </label>
                  <Input
                    id="contact-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <div>
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-white/80">
                    Message
                  </label>
                  <Textarea
                    id="contact-message"
                    rows={4}
                    placeholder="How can we help?"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="border-white/15 bg-white/5 text-white placeholder:text-white/40 focus-visible:border-[#00FF88] focus-visible:ring-[#00FF88]/30"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#00FF88] text-[#0D0D12] hover:bg-[#00e07a] hover:shadow-lg hover:shadow-[#00FF88]/30"
                >
                  <Send className="size-4" />
                  Send message
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Footer (sticky bottom via mt-auto) ────────────────────────────── */}
      <footer className="mt-auto border-t border-white/10 bg-[#0D0D12] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="relative h-9 w-9 overflow-hidden rounded-xl">
                  <Image
                    src="/images/smart-ride-logo.png"
                    alt="Smart Ride Logo"
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                </div>
                <span className="text-lg font-bold text-white">Smart Ride</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm text-white/60">
                Uganda&apos;s all-in-one super app for rides, food, shopping,
                pharmacy, wallet, and safety. Built in Kampala by Natural
                Intellects Corp.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <MapPin className="size-3.5" />
                Kampala, Uganda
              </div>
            </div>

            {/* Quick links */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Quick Links
              </h4>
              <ul className="mt-4 space-y-2">
                {footerLinks.company.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-[#00FF88]"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal links */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                Legal
              </h4>
              <ul className="mt-4 space-y-2">
                {footerLinks.legal.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-white/60 transition-colors hover:text-[#00FF88]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
            <p className="text-xs text-white/40">
              &copy; {new Date().getFullYear()} Smart Ride · Natural Intellects Corp. All rights reserved.
            </p>
            <div className="flex items-center gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label="Smart Ride social media"
                  className="text-white/40 transition-colors hover:text-[#00FF88]"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
