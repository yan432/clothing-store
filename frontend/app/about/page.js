import Link from 'next/link'
import s from './page.module.css'
import ChapterMosaic from './ChapterMosaic'
import CoverParallax from './CoverParallax'
import StatCounter from './StatCounter'
import Reveal from './Reveal'
import MosaicReveal from './MosaicReveal'

const secondaryCities = [
  'Madrid', 'Kaunas', 'Poznań', 'Odesa', 'Augsburg',
  'Lviv', 'Kharkiv', 'Cortona', 'Ivano-Frankivsk', 'Toronto',
]

export const metadata = {
  title: 'About',
  description: 'Garments made from what was already there — the story of edm.clothes.',
}

function DownloadIcon({ color = 'currentColor' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}

const chapters = [
  {
    num: '01',
    yr: '2020 — 2021 · Chapter One',
    title: <>The first <em>steps.</em></>,
    bodyNode: <>
      <p><em>Interception</em> was our first full-fledged collection — nine carefully crafted pieces. Before it, we had been experimenting with upcycling and producing basic items. Interception was our first real attempt at designing and manufacturing a cohesive set of garments at once.</p>
      <p>One of the standout pieces was the <em>Loose Fit Pants</em>, a design that has remained one of our most popular to this day. Lightweight fabric, a wide-leg cut, and classic tailoring details like pleats — that foundation was set then, and it still anchors the silhouette today.</p>
    </>,
    // 9 фото — по одной на каждую вещь коллекции
    mosaic: [
      { src: '/about/img/interception-1.jpg', caption: 'Interception — Item 1/9' },
      { src: '/about/img/interception-2.jpg', caption: 'Interception — Item 2/9' },
      { src: '/about/img/interception-3.jpg', caption: 'Interception — Item 3/9' },
      { src: '/about/img/interception-4.jpg', caption: 'Interception — Item 4/9' },
      { src: '/about/img/interception-5.jpg', caption: 'Interception — Item 5/9' },
      { src: '/about/img/interception-6.jpg', caption: 'Interception — Item 6/9' },
      { src: '/about/img/interception-7.jpg', caption: 'Interception — Item 7/9' },
      { src: '/about/img/interception-8.jpg', caption: 'Interception — Item 8/9' },
      { src: '/about/img/interception-9.jpg', caption: 'Interception — Item 9/9' },
    ],
  },
  {
    num: '02',
    yr: '2021 · Chapter Two',
    title: <><em>Delirium.</em></>,
    definition: <>Latin: <em>delirium</em> — &ldquo;madness, delirium&rdquo;;<br/><em>deliro</em> — &ldquo;to rave, to be insane&rdquo;</>,
    body: <>Delirium marked the first time we used a self-designed graphic for a print. With it, we transitioned to silk-screen printing and embroidery for mass production, our first proper step into graphic apparel.</>,
    imgs: [
      { src: '/about/img/delirium-print.jpg', caption: 'Delirium print' },
    ],
    solo: true,
    tone: 'delirium',
  },
  {
    num: '03',
    yr: '2021 — 2022 · Chapter Three',
    title: <>Abyss · Ablepsia · <em>Eclipse.</em></>,
    body: <>A trilogy of darker collections. We stopped asking what fashion should look like and started asking what it could mean — through culture, ideas and references. For insane The Eclipse Vests lunar imagery referenced Berserk by Kentaro Miura; the castle and monstrous figures came from Bram Stoker's Dracula.</>,
    imgs: [
      { src: '/about/img/abyss-monument.jpg', caption: 'Abyss' },
      { src: '/about/img/ablepsia.jpg', caption: 'Eclipse' },
    ],
  },
  {
    num: '04',
    yr: '2022 · Chapter Four',
    title: <>The <em>War.</em></>,
    body: <>February 2022 changed everything. The studio went dark. Some pieces never made it to release. Production however stayed inside Ukraine. Supporting local manufacturers, even now, was non-negotiable.</>,
    imgs: [
      { src: '/about/img/druzhkivka.jpg', caption: 'Druzhkivka, 2022' },
    ],
    solo: true,
  },
  {
    num: '05',
    yr: '2023 · Chapter Five',
    title: <>The year of <em>jeans.</em></>,
    body: <>We took denim apart and put it back together — as deconstructed silhouettes. The Scars Hoodie came out of the same process, almost by accident. The sample shrunk past our spec; instead of scrapping it, we kept the sharper, slimmer cut. Worn with the wide-leg jeans, it became a set.</>,
    imgs: [
      { src: '/about/img/jeans-deconstructed.jpg', caption: 'Deconstructed jeans' },
      { src: '/about/img/denim-set.jpg', caption: 'Scars hoodie' },
    ],
    tone: 'denim',
  },
  {
    num: '06',
    yr: '2024 · Chapter Six',
    title: <><em>Riot.</em></>,
    body: <>The Riot Bomber was the most ambitious project we'd ever taken on. Outerwear is a whole new level of complexity, so we approached this as a collaboration with Alex Cartel. A detachable hood, adjustable cinched sleeves, Thinsulate insulation. Visually striking. Highly functional.</>,
    imgs: [
      { src: '/about/img/riot-bomber.jpg', caption: 'Riot Bomber' },
    ],
    solo: true,
  },
  {
    num: '07',
    yr: '— · Chapter Seven',
    title: <><em>Unrealised.</em></>,
    body: <>The pieces that didn't make it. Sketches, prototypes, ideas put on hold. Sometimes the things we don't ship say more about us than the ones we do.</>,
    imgs: [
      { src: '/about/img/u1.jpg', caption: 'Archive' },
    ],
    solo: true,
  },
]

const mosaicImages = [
  { src: '/about/img/p-interception-poster.jpg', alt: 'Interception poster', cls: 'm1' },
  { src: '/about/img/p-delirium-dtf.jpg', alt: 'Delirium DTF print', cls: 'm2' },
  { src: '/about/img/p-abyss-spread.jpg', alt: 'Abyss spread', cls: 'm3' },
  { src: '/about/img/p-denim-set.jpg', alt: 'Denim set', cls: 'm4' },
  { src: '/about/img/p-riot-bomber.jpg', alt: 'Riot bomber', cls: 'm5' },
  { src: '/about/img/p-thermochromic.jpg', alt: 'Thermochromic', cls: 'm6' },
  { src: '/about/img/p-jeans-deconstructed.jpg', alt: 'Jeans deconstructed', cls: 'm7' },
]

export default function AboutPage() {
  return (
    <div className={s.root}>

      {/* ─── COVER ─── */}
      <section className={s.cover}>
        <div className={s.coverPhoto}>
          <CoverParallax src="/about/cover-hero.jpg" alt="edm.clothes" />
        </div>
        <div className={s.coverGlow} aria-hidden="true">
          <div className={s.coverGlowA} />
          <div className={s.coverGlowB} />
          <div className={s.coverGlowC} />
        </div>
        <div className={s.coverMetaTop}>
          <span>edm.clothes — The Journal</span>
          <span>Vol. I · Berlin, 2025</span>
        </div>
        <div className={s.coverInner}>
          <div className={s.coverVol}>est. 2020 · ssn ∞</div>
          <h1 className={s.coverH1}>
            A river<br/>
            that carves<br/>
            <em>its own path.</em>
          </h1>
          <p className={s.coverSub}>
            Garments made for us to be worn and express ourselves — re-stitched, re-designed, re-imagined. The story of how a small upcycling experiment became a brand, and a question we keep asking ourselves.
          </p>
          <div className={s.ctas}>
            <a href="/about/edm-journal.pdf" className={`${s.btn} ${s.btnPrimary}`} download style={{ background: '#fff', color: '#000' }}>
              <DownloadIcon color="#000" />
              Download the journal
            </a>
            <a href="#preamble" className={`${s.btn} ${s.btnGhost}`} style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.45)', background: 'transparent' }}>Read here →</a>
          </div>
        </div>
        <div className={s.coverScroll}>Scroll</div>
      </section>

      {/* ─── PREAMBLE ─── */}
      <Reveal as="section" className={`${s.preamble} ${s.page}`} id="preamble">
        <div className={s.preambleGrid}>
          <div className={s.labelRow}>
            <div className={s.label}>Preamble</div>
            <div className={s.labelRowNum}>00</div>
            <div className={s.label} style={{ color: '#888' }}>Yan Yavorovych<br/>Ilya Habdrakhmanov</div>
          </div>
          <div className={s.preambleBody}>
            <p>edm.clothes started as a project rooted in upcycling — long before it became a well-known movement — and has grown into a global brand. In the early days we sourced second-hand clothing, tailored and reimagined pieces, and gave them a new life.</p>
            <p>From those humble beginnings we've grown into something much bigger, selling our creations worldwide and constantly exploring new ideas. Yet, even now, we are still in the process of discovering who we truly are. Like a river that carves its path over time, reshaping itself while always moving forward, we continue to evolve.</p>
            <p>This page is a chronicle of that story — a mirror held up to our past, helping us understand where we are headed next.</p>
            <div className={s.signature}>— Yan &amp; Ilya</div>
          </div>
        </div>
      </Reveal>

      {/* ─── FACTS / CITIES ─── */}
      <Reveal as="section" className={s.facts} id="chronology">
        <div className={s.factsStatsBand}>
          <div className={s.factsInner}>
            <div className={s.factsRow}>
              <div>
                <div className={s.statN}><StatCounter value={6} /></div>
                <div className={s.statL}>Years</div>
              </div>
              <div>
                <div className={s.statN}><StatCounter value={12} suffix="k" /></div>
                <div className={s.statL}>Garments shipped</div>
              </div>
              <div>
                <div className={s.statN}><StatCounter value={42} /></div>
                <div className={s.statL}>Countries</div>
              </div>
            </div>
          </div>
        </div>
        <div className={s.factsCitiesBand}>
          <div className={s.factsInner}>
            <div className={s.cities}>
              <div className={s.label}>Worn in</div>
              <h3>Berlin · Kyiv · Tokyo · LA · Paris · Warsaw</h3>
              <div className={s.cityMarquee} aria-label="Also worn in">
                <div className={s.cityMarqueeTrack}>
                  {[...secondaryCities, ...secondaryCities].map((c, i) => (
                    <span key={i} aria-hidden={i >= secondaryCities.length ? 'true' : undefined}>{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* ─── CHRONOLOGY ROWS ─── */}
      <section className={s.chrono}>
        {chapters.map((ch, i) => {
          const reverse = i % 2 === 1
          const toneClass = ch.tone ? s[`tone_${ch.tone}`] : ''
          const wrapClass = [
            s.chronoRowWrap,
            reverse ? s.chronoRowReverse : '',
            toneClass,
          ].filter(Boolean).join(' ')
          return (
            <Reveal key={ch.num} className={wrapClass}>
              <div className={s.chronoRow}>
                <div className={s.chronoNum}>{ch.num}</div>
                <div className={s.chronoInfo}>
                  <div className={s.chronoYr}>{ch.yr}</div>
                  <h3>{ch.title}</h3>
                  {ch.definition && <p className={s.definition}>{ch.definition}</p>}
                  {ch.bodyNode ?? <p>{ch.body}</p>}
                </div>
                <div className={`${s.chronoImgs} ${ch.solo || ch.mosaic ? s.chronoImgsSolo : ''}`}>
                  {ch.mosaic ? (
                    <ChapterMosaic items={ch.mosaic} idleCaption="Interception — 9 pieces · tap any to expand" />
                  ) : ch.imgs.map((img) => (
                    <figure key={img.src} className={s.chronoFigure}>
                      <div className={`${s.chronoPh} ${ch.solo ? s.chronoSoloPh : ''}`}>
                        <img src={img.src} alt={img.caption} loading="lazy" />
                      </div>
                      <figcaption className={s.chronoCaption}>{img.caption}</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </Reveal>
          )
        })}
      </section>

      {/* ─── MANIFESTO ─── */}
      <Reveal as="section" className={s.fullDark}>
        <div className={s.fullDarkInner}>
          <div className={s.fullDarkLabel}>Manifesto</div>
          <div className={s.pullquote}>
            We don&apos;t believe in seasons.{' '}
            <em>We believe in chapters — work that gets to age, mutate, and survive the year it was made in.</em>
          </div>
          <span className={s.pullquoteAttr}>— edm.clothes</span>
        </div>
      </Reveal>

      {/* ─── MOSAIC ─── */}
      <Reveal as="section" className={`${s.mosaicSection} ${s.page}`}>
        <div className={s.labelCenter}>Visual essay</div>
        <h2>edm.clothes <em>in pictures.</em></h2>
        <MosaicReveal images={mosaicImages} />
        <div className={s.mosaicCta}>
          <a href="https://www.instagram.com/edm.clothes" target="_blank" rel="noopener noreferrer" className={s.mosaicInstaBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            See more on Instagram
          </a>
          <a href="https://www.tiktok.com/@edm_clothes" target="_blank" rel="noopener noreferrer" className={s.mosaicInstaBtn}>
            <svg width="14" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
            </svg>
            Follow on TikTok
          </a>
        </div>
      </Reveal>

      {/* ─── EPILOGUE ─── */}
      <Reveal as="section">
        <div className={s.epilogue}>
          <div className={s.epilogueKicker}>The journal</div>
          <h2>Learn more about us.</h2>
          <p>The full journal — 30 pages, photography, essays, sketches — is a free download. Print it, fold it, tear out a page and pin it to your wall.</p>
          <div className={s.epilogueCta}>
            <a href="/about/edm-journal.pdf" className={`${s.epilogueBtn} ${s.epilogueBtnPrimary}`} download style={{ background: '#000', color: '#fff' }}>
              <DownloadIcon color="#fff" />
              Download PDF
            </a>
            <Link href="/products" className={`${s.epilogueBtn} ${s.epilogueBtnGhost}`} style={{ color: '#1a1a18', border: '1px solid #1a1a18', background: 'transparent' }}>
              Shop →
            </Link>
          </div>
          <div className={s.epilogueMeta}>PDF · 30 pages · ~12 MB · Vol. I, Berlin 2025</div>
        </div>
      </Reveal>

    </div>
  )
}
