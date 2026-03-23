import Link from 'next/link'
import { redirect } from 'next/navigation'
import { homepageContent } from './lib/homepageContent'
import { getApiUrl } from './lib/api'

async function getNewArrivals() {
  try {
    const res = await fetch(getApiUrl('/products'), { cache: 'no-store' })
    if (!res.ok) return []
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    return list
      .filter((item) => Array.isArray(item.tags) && item.tags.includes('new'))
      .sort((a, b) => Number(b.id || 0) - Number(a.id || 0))
      .slice(0, 4)
  } catch {
    return []
  }
}

export default async function Home({ searchParams }) {
  const params = searchParams || {}
  const recoveryType = String(params.type || '')
  const hasRecoveryPayload =
    recoveryType === 'recovery' ||
    Boolean(params.token) ||
    Boolean(params.token_hash) ||
    Boolean(params.code)

  if (hasRecoveryPayload) {
    const qp = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value == null) return
      if (Array.isArray(value)) {
        value.forEach((v) => qp.append(key, String(v)))
      } else {
        qp.set(key, String(value))
      }
    })
    const query = qp.toString()
    redirect(query ? `/auth/reset?${query}` : '/auth/reset')
  }

  const { hero, promoTiles, spotlight, arrivals } = homepageContent
  const newArrivals = await getNewArrivals()
  const arrivalCards = newArrivals.length > 0
    ? newArrivals.map((item) => ({
      key: String(item.id),
      href: `/products/${item.id}`,
      image: (Array.isArray(item.image_urls) && item.image_urls[0]) || item.image_url || '',
      title: item.name || 'Product',
      price: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(item.price || 0)),
    }))
    : arrivals.map((item) => ({
      key: `${item.title}-${item.image}`,
      href: '/products?special=new',
      image: item.image,
      title: item.title,
      price: item.price,
    }))

  return (
    <main className="pb-20 md:pb-28">
      <section className="relative min-h-[78vh] overflow-hidden rounded-b-[28px] bg-zinc-900 text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `linear-gradient(to top, rgba(0,0,0,.72), rgba(0,0,0,.25), rgba(0,0,0,.32)), url(${hero.image})`,
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col items-center justify-center px-6 text-center">
          <p className="mb-5 text-[11px] uppercase tracking-[0.28em] text-zinc-200">{hero.season}</p>
          <h1 className="mb-4 text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            {hero.title}
          </h1>
          <p className="mb-9 max-w-md text-base text-zinc-200 md:text-lg">{hero.subtitle}</p>
          <Link
  href="/products"
  className="rounded-md border border-white bg-transparent px-8 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-white hover:text-black"
>
  {hero.cta}
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-14 max-w-6xl px-4 md:mt-20 md:px-6">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 md:grid-cols-2 lg:max-w-none lg:grid-cols-4 lg:gap-5">
          {promoTiles.map((tile) => (
            <Link
              key={tile.title}
              href={tile.href}
              className="group overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100"
            >
              <div
                className="relative aspect-[3/4] bg-cover bg-center transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `linear-gradient(to top, rgba(17,17,17,.04), rgba(17,17,17,.04)), url(${tile.image})` }}
                aria-label={tile.title}
              >
              </div>
              <div className="flex min-h-14 items-center justify-center bg-white px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-900">
                  {tile.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 md:mt-24 md:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-zinc-900 text-white">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(to top, rgba(0,0,0,.78), rgba(0,0,0,.28), rgba(0,0,0,.22)), url(${spotlight.image})`,
            }}
            aria-hidden="true"
          />
          <div className="relative flex min-h-[62vh] flex-col items-center justify-end px-6 pb-10 text-center md:min-h-[70vh]">
            <h2 className="text-3xl font-semibold uppercase tracking-[0.1em] md:text-4xl">
              {spotlight.title}
            </h2>
            <p className="mt-3 max-w-md text-sm text-zinc-200 md:text-base">{spotlight.subtitle}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/products"
                className="rounded-md border border-white bg-white px-7 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black transition hover:bg-transparent hover:text-white"
              >
                {spotlight.primaryCta}
              </Link>
              <Link
                href="/products"
                className="rounded-md border border-white/75 px-7 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white hover:text-black"
              >
                {spotlight.secondaryCta}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 md:mt-24 md:px-6">
        <div className="mb-8 flex items-center justify-between">
          <h3 className="text-xl font-semibold uppercase tracking-[0.12em] text-zinc-900 md:text-2xl">
            New Arrivals
          </h3>
          <Link href="/products?special=new" className="text-xs font-medium uppercase tracking-[0.1em] text-zinc-600 hover:text-zinc-900">
            View all
          </Link>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4 md:gap-5 lg:max-w-none">
          {arrivalCards.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className="group rounded-2xl border border-zinc-200 bg-white p-2.5 md:p-3"
            >
              <div
                className="aspect-[3/4] overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center transition duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${item.image})` }}
                aria-label={item.title}
              >
              </div>
              <div className="flex min-h-[66px] flex-col items-center justify-center pt-3 pb-1 text-center">
                <p className="text-[11px] font-semibold uppercase leading-tight tracking-[0.08em] text-zinc-900 md:text-xs">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-zinc-600 md:text-sm">{item.price}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}