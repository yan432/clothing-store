async function getProduct(id) {
  const res = await fetch(`http://localhost:8000/products/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id)
  if (!product) return <div className="p-12 text-center text-gray-400">Product not found</div>

  return (
    <main className="min-h-screen">
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center justify-between">
        <a href="/" className="text-xl font-semibold tracking-tight">STORE</a>
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <a href="/products" className="hover:text-black">Shop</a>
          <a href="/cart" className="hover:text-black">Cart (0)</a>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <a href="/products" className="text-sm text-gray-400 hover:text-black mb-8 inline-block">← Back</a>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
            No image
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-sm text-gray-400 mb-2">{product.category}</p>
            <h1 className="text-3xl font-semibold mb-3">{product.name}</h1>
            <p className="text-gray-500 mb-6">{product.description}</p>
            <p className="text-2xl font-semibold mb-8">${product.price}</p>
            <p className={`text-sm mb-6 ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {product.stock > 0 ? `In stock (${product.stock})` : 'Out of stock'}
            </p>
            <button className="w-full bg-black text-white py-4 rounded-full font-medium hover:bg-gray-800 transition-colors">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
