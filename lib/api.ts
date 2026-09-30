
export interface WebhookConfig {
  url: string;
  provider: 'mercadopago' | 'stripe' | 'pagbank';
  events: string[];
  status: 'active' | 'pending' | 'error';
  lastVerified?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  sales: number;
  status: 'active' | 'paused';
  type: 'Digital' | 'SaaS' | 'Service';
  trend: number[];
  webhooks?: WebhookConfig[];
}

const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: "Curso de Inteligência Artificial", price: 297.00, sales: 45, status: 'active', type: 'Digital', trend: [12, 19, 15, 25, 32, 28, 45], webhooks: [] },
  { id: '2', name: "E-book Growth Hacking", price: 47.00, sales: 128, status: 'active', type: 'Digital', trend: [85, 92, 110, 105, 115, 120, 128], webhooks: [] },
  { id: '3', name: "SaaS Starter Template", price: 99.00, sales: 12, status: 'paused', type: 'SaaS', trend: [5, 8, 12, 10, 9, 11, 12], webhooks: [] },
  { id: '4', name: "Consultoria Premium", price: 1500.00, sales: 3, status: 'active', type: 'Service', trend: [1, 2, 1, 2, 3, 2, 3], webhooks: [] },
];

const STORAGE_KEY = 'ner_products_v2';

const delay = (ms?: number) => new Promise(resolve => setTimeout(resolve, ms ?? Math.floor(Math.random() * 800) + 200));

export const ProductAPI = {
  getProducts: async (): Promise<Product[]> => {
    await delay();
    if (typeof window === 'undefined') return DEFAULT_PRODUCTS;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PRODUCTS));
      return DEFAULT_PRODUCTS;
    }
    return JSON.parse(stored);
  },

  saveProducts: async (products: Product[]): Promise<void> => {
    await delay();
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  },

  updateProduct: async (id: string, updates: Partial<Product>): Promise<Product> => {
    await delay();
    const products = await ProductAPI.getProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Produto não encontrado");
    
    const updated = { ...products[index], ...updates };
    products[index] = updated;
    await ProductAPI.saveProducts(products);
    return updated;
  },

  registerWebhook: async (productId: string, config: Omit<WebhookConfig, 'status'>): Promise<WebhookConfig> => {
    await delay(1000); // More realistic for remote registration
    const products = await ProductAPI.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product) throw new Error("Produto não encontrado");

    const newConfig: WebhookConfig = {
      ...config,
      status: 'pending',
      lastVerified: Date.now()
    };

    const webhooks = product.webhooks || [];
    // Replace if provider exists or add new
    const existingIndex = webhooks.findIndex(w => w.provider === config.provider);
    if (existingIndex > -1) {
      webhooks[existingIndex] = newConfig;
    } else {
      webhooks.push(newConfig);
    }

    await ProductAPI.updateProduct(productId, { webhooks });
    return newConfig;
  },

  validateWebhook: async (productId: string, provider: string): Promise<boolean> => {
    await delay(1500);
    const products = await ProductAPI.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product || !product.webhooks) return false;

    const webhook = product.webhooks.find(w => w.provider === provider);
    if (!webhook) return false;

    // Simulate validation check
    const isValid = webhook.url.startsWith('https://');
    
    const updatedWebhooks = product.webhooks.map(w => 
      w.provider === provider ? { ...w, status: isValid ? 'active' : 'error' as const } : w
    );

    await ProductAPI.updateProduct(productId, { webhooks: updatedWebhooks });
    return isValid;
  },

  deleteProduct: async (id: string): Promise<void> => {
    await delay();
    const products = await ProductAPI.getProducts();
    const filtered = products.filter(p => p.id !== id);
    await ProductAPI.saveProducts(filtered);
  },

  duplicateProduct: async (id: string): Promise<Product> => {
    await delay();
    const products = await ProductAPI.getProducts();
    const product = products.find(p => p.id === id);
    if (!product) throw new Error("Produto não encontrado");

    const duplicated: Product = {
      ...product,
      id: Math.random().toString(36).substr(2, 9),
      name: `${product.name} (Cópia)`,
      sales: 0
    };

    await ProductAPI.saveProducts([duplicated, ...products]);
    return duplicated;
  }
};
