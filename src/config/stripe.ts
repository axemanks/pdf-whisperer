// will have pricing

export const PLANS = [
  {
    name: 'Free',
    slug: 'free',
    quota: 10,
    pagesPerPdf: 200,
    price: {
      amount: 0,
      priceIds: {
        test: '',
        production: '',
      },
    },
  },
  {
    name: 'Pro',
    slug: 'pro',
    quota: 50,
    pagesPerPdf: 1000,
    price: {
      amount: 20,
      priceIds: {
        test: 'price_1NxE5yH4u451k3pm6nFq2kEG',
        production: 'price_1NxE5yH4u451k3pm6nFq2kEG',
      },
    },
  },
];
