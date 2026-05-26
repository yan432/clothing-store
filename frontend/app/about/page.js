import Link from 'next/link'
import s from './page.module.css'
import ChapterMosaic from './ChapterMosaic'
import CoverParallax from './CoverParallax'
import StatCounter from './StatCounter'
import Reveal from './Reveal'
import MosaicReveal from './MosaicReveal'
import { pathForLocale } from '../lib/i18n'
import { localizedAlternates } from '../lib/seo'

const secondaryCitiesEn = [
  'Madrid', 'Kaunas', 'Poznań', 'Odesa', 'Augsburg',
  'Lviv', 'Kharkiv', 'Cortona', 'Ivano-Frankivsk', 'Toronto',
]

const secondaryCitiesUk = [
  'Мадрид', 'Каунас', 'Познань', 'Одеса', 'Аугсбург',
  'Львів', 'Харків', 'Кортона', 'Івано-Франківськ', 'Торонто',
]

export const metadata = {
  title: 'About',
  description: 'Garments made from what was already there — the story of edm.clothes.',
  alternates: localizedAlternates('/about'),
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

const chaptersEn = [
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
    body: <>A trilogy of darker collections. We stopped asking what fashion should look like and started asking what it could mean — through culture, ideas and references. For insane The Eclipse Vests lunar imagery referenced Berserk by Kentaro Miura; the castle and monstrous figures came from Bram Stoker&apos;s Dracula.</>,
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
    body: <>The Riot Bomber was the most ambitious project we&apos;d ever taken on. Outerwear is a whole new level of complexity, so we approached this as a collaboration with Alex Cartel. A detachable hood, adjustable cinched sleeves, Thinsulate insulation. Visually striking. Highly functional.</>,
    imgs: [
      { src: '/about/img/riot-bomber.jpg', caption: 'Riot Bomber' },
    ],
    solo: true,
  },
  {
    num: '07',
    yr: '— · Chapter Seven',
    title: <><em>Unrealised.</em></>,
    body: <>The pieces that didn&apos;t make it. Sketches, prototypes, ideas put on hold. Sometimes the things we don&apos;t ship say more about us than the ones we do.</>,
    imgs: [
      { src: '/about/img/u1.jpg', caption: 'Archive' },
    ],
    solo: true,
  },
]

const chaptersUk = [
  {
    num: '01',
    yr: '2020 - 2021 · Розділ перший',
    title: <>Перші <em>кроки.</em></>,
    bodyNode: <>
      <p><em>Interception</em> стала нашою першою повноцінною колекцією з дев’яти продуманих речей. До цього ми експериментували з апсайклінгом і базовими виробами. Interception була першою серйозною спробою спроєктувати й виготовити цілісний набір одягу одразу.</p>
      <p>Одна з ключових речей, <em>Loose Fit Pants</em>, досі залишається одним із наших найпопулярніших силуетів. Легка тканина, широкий крій, класичні деталі на кшталт складок. Ця основа з’явилася тоді й досі тримає силует.</p>
    </>,
    mosaic: [
      { src: '/about/img/interception-1.jpg', caption: 'Interception - річ 1/9' },
      { src: '/about/img/interception-2.jpg', caption: 'Interception - річ 2/9' },
      { src: '/about/img/interception-3.jpg', caption: 'Interception - річ 3/9' },
      { src: '/about/img/interception-4.jpg', caption: 'Interception - річ 4/9' },
      { src: '/about/img/interception-5.jpg', caption: 'Interception - річ 5/9' },
      { src: '/about/img/interception-6.jpg', caption: 'Interception - річ 6/9' },
      { src: '/about/img/interception-7.jpg', caption: 'Interception - річ 7/9' },
      { src: '/about/img/interception-8.jpg', caption: 'Interception - річ 8/9' },
      { src: '/about/img/interception-9.jpg', caption: 'Interception - річ 9/9' },
    ],
  },
  {
    num: '02',
    yr: '2021 · Розділ другий',
    title: <><em>Delirium.</em></>,
    definition: <>Латина: <em>delirium</em> - “марення, божевілля”;<br/><em>deliro</em> - “марити, бути не при собі”</>,
    body: <>Delirium був першим моментом, коли ми використали власну графіку для принта. З ним ми перейшли до шовкотрафаретного друку й вишивки для тиражного виробництва, тобто зробили перший справжній крок у графічний одяг.</>,
    imgs: [
      { src: '/about/img/delirium-print.jpg', caption: 'Delirium print' },
    ],
    solo: true,
    tone: 'delirium',
  },
  {
    num: '03',
    yr: '2021 - 2022 · Розділ третій',
    title: <>Abyss · Ablepsia · <em>Eclipse.</em></>,
    body: <>Трилогія темніших колекцій. Ми перестали питати, як має виглядати мода, і почали питати, що вона може означати через культуру, ідеї та референси. У The Eclipse Vests місячна образність відсилала до Berserk Кентаро Міури, а замок і монструозні фігури до Dracula Брема Стокера.</>,
    imgs: [
      { src: '/about/img/abyss-monument.jpg', caption: 'Abyss' },
      { src: '/about/img/ablepsia.jpg', caption: 'Eclipse' },
    ],
  },
  {
    num: '04',
    yr: '2022 · Розділ четвертий',
    title: <>The <em>War.</em></>,
    body: <>Лютий 2022 року змінив усе. Студія завмерла. Частина речей так і не вийшла. Але виробництво залишилося в Україні. Підтримувати локальних виробників навіть у таких умовах для нас було принциповим рішенням.</>,
    imgs: [
      { src: '/about/img/druzhkivka.jpg', caption: 'Дружківка, 2022' },
    ],
    solo: true,
  },
  {
    num: '05',
    yr: '2023 · Розділ п’ятий',
    title: <>Рік <em>деніму.</em></>,
    body: <>Ми розібрали денім і зібрали його заново у деконструйованих силуетах. Scars Hoodie з’явився з того самого процесу майже випадково. Зразок сів сильніше, ніж ми планували. Замість списати його, ми залишили гостріший і вужчий крій. У парі з широкими джинсами він став комплектом.</>,
    imgs: [
      { src: '/about/img/jeans-deconstructed.jpg', caption: 'Deconstructed jeans' },
      { src: '/about/img/denim-set.jpg', caption: 'Scars hoodie' },
    ],
    tone: 'denim',
  },
  {
    num: '06',
    yr: '2024 · Розділ шостий',
    title: <><em>Riot.</em></>,
    body: <>Riot Bomber став найамбітнішим проєктом, за який ми бралися. Верхній одяг - це зовсім інший рівень складності, тому ми підійшли до нього як до колаборації з Alex Cartel. Знімний капюшон, регульовані рукави, утеплювач Thinsulate. Виразний зовні й функціональний у носінні.</>,
    imgs: [
      { src: '/about/img/riot-bomber.jpg', caption: 'Riot Bomber' },
    ],
    solo: true,
  },
  {
    num: '07',
    yr: '- · Розділ сьомий',
    title: <><em>Нереалізоване.</em></>,
    body: <>Речі, які не вийшли. Ескізи, прототипи, ідеї, відкладені на потім. Іноді те, що ми не запускаємо, говорить про нас не менше, ніж те, що доходить до релізу.</>,
    imgs: [
      { src: '/about/img/u1.jpg', caption: 'Архів' },
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

const ABOUT_COPY = {
  en: {
    coverMetaLeft: 'edm.clothes - The Journal',
    coverMetaRight: 'Vol. I · Berlin, 2025',
    coverVol: 'est. 2020 · ssn ∞',
    coverTitle: <>A river<br/>that carves<br/><em>its own path.</em></>,
    coverSub: 'Garments made for us to be worn and express ourselves - re-stitched, re-designed, re-imagined. The story of how a small upcycling experiment became a brand, and a question we keep asking ourselves.',
    download: 'Download the journal',
    readHere: 'Read here ->',
    scroll: 'Scroll',
    preamble: 'Preamble',
    authors: <>Yan Yavorovych<br/>Ilya Habdrakhmanov</>,
    preambleBody: [
      'edm.clothes began as an upcycling project, long before it became a movement, sourcing second-hand pieces, re-tailoring them, giving them new life. It has since grown into a global brand.',
      'Yet we are still discovering who we truly are. Like a river carving its own path, we keep reshaping while moving forward.',
      'This page is the chronicle of that story.',
    ],
    signature: '- Yan & Ilya',
    stats: ['Years', 'Garments shipped', 'Countries'],
    wornIn: 'Worn in',
    primaryCities: 'Berlin · Kyiv · Tokyo · LA · Paris · Warsaw',
    alsoWorn: 'Also worn in',
    manifesto: 'Manifesto',
    pullquote: <>We don&apos;t believe in seasons. <em>We believe in chapters - work that gets to age, mutate, and survive the year it was made in.</em></>,
    visualEssay: 'Visual essay',
    pictures: <>edm.clothes <em>in pictures.</em></>,
    instagram: 'See more on Instagram',
    tiktok: 'Follow on TikTok',
    journal: 'The journal',
    epilogueTitle: 'Learn more about us.',
    epilogueText: 'The full journal - 30 pages, photography, essays, sketches - is a free download. Print it, fold it, tear out a page and pin it to your wall.',
    downloadPdf: 'Download PDF',
    shop: 'Shop ->',
    meta: 'PDF · 30 pages · ~12 MB · Vol. I, Berlin 2025',
    mosaicIdle: 'Interception - 9 pieces · tap any to expand',
  },
  uk: {
    coverMetaLeft: 'edm.clothes - Журнал',
    coverMetaRight: 'Vol. I · Берлін, 2025',
    coverVol: 'est. 2020 · ssn ∞',
    coverTitle: <>Річка,<br/>що сама<br/><em>вирізає шлях.</em></>,
    coverSub: 'Одяг, створений, щоб носити його й виражати себе: переосмислений, перекроєний, зібраний заново. Історія про те, як невеликий апсайклінг-експеримент став брендом, і питання, які ми досі ставимо собі.',
    download: 'Завантажити журнал',
    readHere: 'Читати тут ->',
    scroll: 'Скрол',
    preamble: 'Передмова',
    authors: <>Yan Yavorovych<br/>Ilya Habdrakhmanov</>,
    preambleBody: [
      'edm.clothes почався як апсайклінг-проєкт задовго до того, як став брендом: ми знаходили second-hand речі, перекроювали їх і давали їм нове життя. З часом це виросло у бренд з міжнародною аудиторією.',
      'Та ми все ще шукаємо, ким є насправді. Як річка, що вирізає власний шлях, ми змінюємо форму, поки рухаємося вперед.',
      'Ця сторінка - хроніка цього шляху.',
    ],
    signature: '- Yan & Ilya',
    stats: ['Років', 'Відправлених речей', 'Країн'],
    wornIn: 'Носили в',
    primaryCities: 'Берлін · Київ · Токіо · Лос-Анджелес · Париж · Варшава',
    alsoWorn: 'Також носили в',
    manifesto: 'Маніфест',
    pullquote: <>Ми не віримо в сезони. <em>Ми віримо в розділи: роботу, яка може старіти, змінюватися й переживати рік, у якому була створена.</em></>,
    visualEssay: 'Візуальний есей',
    pictures: <>edm.clothes <em>у кадрах.</em></>,
    instagram: 'Більше в Instagram',
    tiktok: 'Стежити в TikTok',
    journal: 'Журнал',
    epilogueTitle: 'Дізнатися більше про нас.',
    epilogueText: 'Повний журнал - це 30 сторінок фотографій, есеїв і скетчів у вільному доступі. Завантаж, роздрукуй, склади або вирви сторінку й повісь на стіну.',
    downloadPdf: 'Завантажити PDF',
    shop: 'Магазин ->',
    meta: 'PDF · 30 сторінок · ~12 MB · Vol. I, Берлін 2025',
    mosaicIdle: 'Interception - 9 речей · натисни, щоб відкрити',
  },
}

export default function AboutPage({ locale = 'en' }) {
  const isUk = locale === 'uk'
  const copy = ABOUT_COPY[isUk ? 'uk' : 'en']
  const chapters = isUk ? chaptersUk : chaptersEn
  const secondaryCities = isUk ? secondaryCitiesUk : secondaryCitiesEn
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
          <span>{copy.coverMetaLeft}</span>
          <span>{copy.coverMetaRight}</span>
        </div>
        <div className={s.coverInner}>
          <div className={s.coverVol}>{copy.coverVol}</div>
          <h1 className={s.coverH1}>
            {copy.coverTitle}
          </h1>
          <p className={s.coverSub}>
            {copy.coverSub}
          </p>
          <div className={s.ctas}>
            <a href="/about/edm-journal.pdf" className={`${s.btn} ${s.btnPrimary}`} download style={{ background: '#fff', color: '#000' }}>
              <DownloadIcon color="#000" />
              {copy.download}
            </a>
            <a href="#preamble" className={`${s.btn} ${s.btnGhost}`} style={{ color: '#fff', border: '1px solid rgba(255,255,255,0.45)', background: 'transparent' }}>{copy.readHere}</a>
          </div>
        </div>
        <div className={s.coverScroll}>{copy.scroll}</div>
      </section>

      {/* ─── PREAMBLE ─── */}
      <Reveal as="section" className={`${s.preamble} ${s.page}`} id="preamble">
        <div className={s.preambleGrid}>
          <div className={s.labelRow}>
            <div className={s.label}>{copy.preamble}</div>
            <div className={s.labelRowNum}>00</div>
            <div className={s.label} style={{ color: '#888' }}>{copy.authors}</div>
          </div>
          <div className={s.preambleBody}>
            {copy.preambleBody.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            <div className={s.signature}>{copy.signature}</div>
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
                <div className={s.statL}>{copy.stats[0]}</div>
              </div>
              <div>
                <div className={s.statN}><StatCounter value={12} suffix="k" /></div>
                <div className={s.statL}>{copy.stats[1]}</div>
              </div>
              <div>
                <div className={s.statN}><StatCounter value={42} /></div>
                <div className={s.statL}>{copy.stats[2]}</div>
              </div>
            </div>
          </div>
        </div>
        <div className={s.factsCitiesBand}>
          <div className={s.factsInner}>
            <div className={s.cities}>
              <div className={s.label}>{copy.wornIn}</div>
              <h3>{copy.primaryCities}</h3>
              <div className={s.cityMarquee} aria-label={copy.alsoWorn}>
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
                    <ChapterMosaic items={ch.mosaic} idleCaption={copy.mosaicIdle} />
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
          <div className={s.fullDarkLabel}>{copy.manifesto}</div>
          <div className={s.pullquote}>
            {copy.pullquote}
          </div>
          <span className={s.pullquoteAttr}>— edm.clothes</span>
        </div>
      </Reveal>

      {/* ─── MOSAIC ─── */}
      <Reveal as="section" className={`${s.mosaicSection} ${s.page}`}>
        <div className={s.labelCenter}>{copy.visualEssay}</div>
        <h2>{copy.pictures}</h2>
        <MosaicReveal images={mosaicImages} />
        <div className={s.mosaicCta}>
          <a href="https://www.instagram.com/edm.clothes" target="_blank" rel="noopener noreferrer" className={s.mosaicInstaBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="2" y="2" width="20" height="20" rx="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
            {copy.instagram}
          </a>
          <a href="https://www.tiktok.com/@edm_clothes" target="_blank" rel="noopener noreferrer" className={s.mosaicInstaBtn}>
            <svg width="14" height="15" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.75a4.85 4.85 0 01-1.01-.06z"/>
            </svg>
            {copy.tiktok}
          </a>
        </div>
      </Reveal>

      {/* ─── EPILOGUE ─── */}
      <Reveal as="section">
        <div className={s.epilogue}>
          <div className={s.epilogueKicker}>{copy.journal}</div>
          <h2>{copy.epilogueTitle}</h2>
          <p>{copy.epilogueText}</p>
          <div className={s.epilogueCta}>
            <a href="/about/edm-journal.pdf" className={`${s.epilogueBtn} ${s.epilogueBtnPrimary}`} download style={{ background: '#000', color: '#fff' }}>
              <DownloadIcon color="#fff" />
              {copy.downloadPdf}
            </a>
            <Link href={pathForLocale('/products', locale)} className={`${s.epilogueBtn} ${s.epilogueBtnGhost}`} style={{ color: '#1a1a18', border: '1px solid #1a1a18', background: 'transparent' }}>
              {copy.shop}
            </Link>
          </div>
          <div className={s.epilogueMeta}>{copy.meta}</div>
        </div>
      </Reveal>

    </div>
  )
}
