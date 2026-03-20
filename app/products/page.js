async function getProducts() {
  const res = await fetch('http://localhost:8000/products', { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

export default async function ProductsPage() {
  const products = await getProducts()
  return (
    <main className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-semibold tracking-tight">STORE</a>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <a href="/products" className="text-black font-medium">Shop</a>
          <a href="/cart" className="hover:text-black">Cart (0)</a>
        </div>
      </nav>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-semibold mb-8">All Products</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <a key={product.id} href={`/products/${product.id}`}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-50 flex items-center justify-center text-gray-300 text-sm">
                <span>No image</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-400 mb-1">{product.category}</p>
                <h2 className="font-medium text-sm mb-2">{product.name}</h2>
                <p className="text-sm font-semibold">${product.price}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
