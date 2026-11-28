import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroRibbon } from "@/components/hero-ribbon";
import type { PublicSiteSettings } from "@/lib/site-settings-schema";

export function PublicHomeHero({ settings }: { settings: PublicSiteSettings }) {
  const hero = settings.hero;
  const image = hero.imageAssetId
    ? `/api/public-site/banner/${hero.imageAssetId}`
    : hero.imageUrl || "/images/hero-pemanen.jpg";
  const actions = (
    <div className="mt-7 flex flex-wrap items-center gap-2.5">
      {settings.features.membershipInterest ? (
        <Link href={hero.primaryHref || "/gabung"} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#127e2f] px-5 py-3 text-[12.5px] font-bold text-white shadow-sm ring-1 ring-inset ring-white/20 transition hover:bg-[#159a3a]">
          {hero.primaryLabel} <ArrowRight size={15} />
        </Link>
      ) : null}
      <Link href={hero.secondaryHref || "/profil"} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 bg-white/10 px-5 py-3 text-[12.5px] font-bold text-white backdrop-blur-sm transition hover:bg-white/15">
        {hero.secondaryLabel}
      </Link>
    </div>
  );
  const copy = (
    <>
      <div className="flex items-center gap-3">
        <span className="h-px w-9 bg-[#e6c56a]" aria-hidden />
        <span className="text-[10.5px] font-bold uppercase tracking-[0.24em] text-[#f0d79a]">{hero.eyebrow}</span>
      </div>
      <h1 className="mt-4 font-display text-[38px] leading-[1.02] tracking-[-0.03em] text-white sm:text-[50px] lg:text-[60px]">
        <span className="block">{hero.title || settings.identity.siteName}</span>
        <span className="mt-1 block text-[#f2d493]">{hero.subtitle}</span>
      </h1>
      <p className="mt-5 max-w-[48ch] text-[14px] leading-relaxed text-[#e2efe4] sm:text-[15px]">{hero.description}</p>
      {settings.profileContent.heroCredit ? <p className="mt-2 text-[10px] italic leading-relaxed text-[#d2e1d5]">Keterangan visual: {settings.profileContent.heroCredit}</p> : null}
      {actions}
    </>
  );

  if (hero.variant === "split") {
    return (
      <section className="relative overflow-hidden bg-[#0c2b19]">
        <div className="sb-shell grid min-h-[470px] items-center gap-8 py-10 sm:py-14 lg:grid-cols-[1fr_0.95fr] lg:gap-12">
          <div className="relative z-10 max-w-[620px]">{copy}</div>
          <div className="relative min-h-[280px] overflow-hidden rounded-[24px] border border-white/15 shadow-[0_30px_70px_-35px_rgba(0,0,0,.8)] sm:min-h-[360px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={hero.imageAlt} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#092718]/25 via-transparent to-white/10" />
          </div>
        </div>
        <HeroRibbon id="landing" />
      </section>
    );
  }

  if (hero.variant === "editorial") {
    return (
      <section className="relative overflow-hidden bg-[#f3f5ef] py-10 sm:py-14">
        <div className="sb-shell grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="relative z-10 rounded-[22px] bg-[#10341f] px-6 py-8 shadow-[0_20px_50px_-30px_rgba(0,0,0,.55)] sm:px-10 sm:py-12">
            {copy}
          </div>
          <div className="relative min-h-[300px] overflow-hidden rounded-[22px] border-[8px] border-white shadow-[0_18px_45px_-28px_rgba(14,39,24,.45)] sm:min-h-[440px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt={hero.imageAlt} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
            <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-[.18em] text-[#164126]">Srikandi Buana</div>
          </div>
        </div>
        <HeroRibbon id="landing" />
      </section>
    );
  }

  if (hero.variant === "minimal") {
    return (
      <section className="bg-white py-8 sm:py-12">
        <div className="sb-shell">
          <div className="grid overflow-hidden rounded-[22px] bg-[#10341f] lg:grid-cols-[1.1fr_.9fr]">
            <div className="flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12">{copy}</div>
            <div className="relative min-h-[190px] lg:min-h-[360px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt={hero.imageAlt} className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#10341f]/35 to-transparent" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative isolate flex min-h-[430px] flex-col overflow-hidden bg-[#0b2b18] sm:min-h-[480px] lg:min-h-[540px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt={hero.imageAlt} className="absolute inset-0 h-full w-full object-cover object-[68%_38%] sm:object-[64%_40%] lg:object-[62%_42%]" fetchPriority="high" decoding="async" />
      <div className="absolute inset-0 bg-[linear-gradient(96deg,rgba(6,28,16,0.94)_0%,rgba(7,32,18,0.88)_34%,rgba(8,38,21,0.62)_52%,rgba(9,44,24,0.14)_72%,rgba(9,44,24,0)_100%)]" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-28 bg-[linear-gradient(to_bottom,rgba(4,20,11,0.55),rgba(4,20,11,0))]" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(to_top,rgba(6,30,17,0.62),rgba(6,30,17,0))]" aria-hidden />
      <div className="sb-shell relative flex min-h-[330px] flex-1 flex-col justify-center pb-10 pt-10 sm:min-h-[380px] sm:pb-12 sm:pt-12 lg:min-h-[430px] lg:pb-14 lg:pt-14">
        <div className="max-w-[640px]" data-contrast-bg="#082617">{copy}</div>
      </div>
      <HeroRibbon id="landing" />
    </section>
  );
}
