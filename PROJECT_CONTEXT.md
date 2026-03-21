# Clothing Store — Project Context

## Общее
Строим интернет-магазин одежды с нуля. Разработчик: Ян (новичок, до 1 года опыта, знает Python и SQL). Цель — быстрый MVP, потом масштабирование. Сайт на английском языке.

## Стек
- **Бэкенд**: Python + FastAPI + uvicorn
- **База данных**: Supabase (PostgreSQL) + Supabase Storage для фото
- **Фронтенд**: Next.js 16.2 (App Router, JS без TypeScript, Tailwind CSS v4)
- **Деплой (план)**: Vercel (фронт) + Railway (бэк)
- **Оплата (план)**: Stripe

## Структура проекта
```
~/Desktop/clothing-store/
├── backend/
│   ├── main.py          — FastAPI приложение
│   ├── .env             — SUPABASE_URL и SUPABASE_KEY
│   ├── .gitignore
│   └── venv/            — виртуальное окружение Python
└── frontend/
    ├── app/
    │   ├── layout.js         — глобальный layout с CartProvider + NavBar
    │   ├── page.js           — главная страница
    │   ├── globals.css       — стили + Tailwind
    │   ├── products/
    │   │   ├── page.js       — каталог товаров (с SEO + JSON-LD)
    │   │   └── [id]/
    │   │       └── page.js   — страница товара (с SEO + JSON-LD)
    │   ├── cart/
    │   │   └── page.js       — страница корзины
    │   ├── upload/
    │   │   └── page.js       — загрузка фото товаров
    │   ├── feed.xml/
    │   │   └── route.js      — Google Merchant Center XML фид
    │   ├── context/
    │   │   └── CartContext.js — React Context для корзины
    │   └── components/
    │       ├── NavBar.js         — навигация со счётчиком корзины
    │       ├── AddToCartButton.js — кнопка добавления в корзину
    │       └── ProductCard.js    — карточка товара с hover-эффектом
    ├── next.config.mjs   — разрешён домен Supabase для картинок
    └── package.json
```

## Supabase
- **Project URL**: https://tlaagtvplzitmqwqbluq.supabase.co
- **Bucket**: `product-images` (публичный)
- **Таблица `products`**:
  - id (bigserial, PK)
  - name (text)
  - description (text)
  - price (float8)
  - image_url (text)
  - category (text)
  - stock (int4, default 0)
  - created_at (timestamptz, default now())
- Тестовые товары: White T-Shirt, Black Jeans, Grey Hoodie, Beige Trench Coat, White Sneakers (id 4–8)

## Что сделано
- [x] FastAPI бэкенд с CRUD для товаров (/products, /products/{id})
- [x] Загрузка фото через /upload и /products/{id}/image
- [x] Next.js фронтенд — главная, каталог, страница товара
- [x] Корзина через React Context + localStorage (добавить, удалить, изменить кол-во, очистить)
- [x] NavBar со счётчиком товаров в корзине
- [x] SEO: metadata, Open Graph, Twitter Card для каждой страницы
- [x] JSON-LD structured data (Schema.org Product + ItemList)
- [x] Google Merchant Center XML фид на /feed.xml
- [x] Hover-эффекты на карточках товаров (через клиентский компонент)
- [x] Код сохранён на GitHub: github.com/yan432/clothing-store

## Что осталось (приоритеты)
1. **Авторизация** — вход/регистрация через Supabase Auth
2. **Stripe** — оплата через Stripe Checkout + вебхуки
3. **Деплой** — Vercel (фронт) + Railway (бэк)
4. **CMS** — админка для управления товарами без SQL
5. **Карточки товаров** — размеры, цвета, галерея из нескольких фото
6. **Статичные страницы** — About, Contact, FAQ
7. **Facebook Pixel** — подключить после деплоя
8. **Оптимизация алгоритмов** — после запуска

## Как запускать локально

**Бэкенд** (терминал 1):
```bash
cd ~/Desktop/clothing-store/backend
source venv/bin/activate
uvicorn main:app --reload
# работает на http://localhost:8000
# документация: http://localhost:8000/docs
```

**Фронтенд** (терминал 2):
```bash
cd ~/Desktop/clothing-store/frontend
npm run dev
# работает на http://localhost:3000
```

**Если порт занят**:
```bash
lsof -ti:8000 | xargs kill -9   # для бэкенда
kill <PID>                        # для фронтенда (PID показывает ошибка)
```

## Важные нюансы
- На Mac команда `python` не работает — нужно `python3`. Алиас добавлен в ~/.zshrc
- Всегда активировать venv перед запуском бэкенда: `source venv/bin/activate`
- Next.js 15: params нужно awaiting — `const { id } = await params`
- Tailwind v4: используется `@import "tailwindcss"` вместо `@tailwind base` и тд
- Hover-эффекты через CSS классы не работают с Tailwind v4 — использовать клиентские компоненты с useState
- Event handlers (onMouseOver и тд) нельзя в серверных компонентах Next.js — только в 'use client'
- .env файл в .gitignore — ключи не попадают в GitHub
- frontend/.git был удалён чтобы не было вложенного репозитория

## Ключевые URL (локально)
- http://localhost:3000 — главная
- http://localhost:3000/products — каталог
- http://localhost:3000/cart — корзина
- http://localhost:3000/upload — загрузка фото
- http://localhost:3000/feed.xml — Google Merchant фид
- http://localhost:8000/docs — Swagger документация API
- http://localhost:8000/products — JSON список товаров
