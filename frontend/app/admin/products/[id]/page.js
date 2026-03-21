import ProductEditorClient from './ProductEditorClient'

export const metadata = {
  title: 'Edit Product',
  description: 'Update product details and stock.',
}

export default async function EditProductPage({ params }) {
  const { id } = await params
  return <ProductEditorClient id={id} />
}
