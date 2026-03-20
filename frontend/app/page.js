export default function Home() {
  return (
    <main>
      <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-6">Spring / Summer 2026</p>
        <h1 className="text-6xl md:text-7xl font-semibold tracking-tight mb-6 leading-none">
          New<br/>Collection
        </h1>
        <p className="text-gray-400 text-lg mb-10 max-w-sm">
          Minimal essentials designed for everyday wear
        </p>
        <a href="/products"
          className="bg-black text-white px-10 py-4 rounded-full text-sm font-medium hover:bg-gray-800 active:scale-95 transition-all">
          Shop Now
        </a>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-3 gap-4">
          {['T-Shirts', 'Jeans', 'Hoodies'].map((cat) => (
            <a key={cat} href={'/products'}
              className="aspect-video bg-gray-100 rounded-2xl flex items-end p-5 hover:bg-gray-200 transition-colors group">
              <span className="text-sm font-medium group-hover:translate-x-1 transition-transform">{cat} →</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  )
}