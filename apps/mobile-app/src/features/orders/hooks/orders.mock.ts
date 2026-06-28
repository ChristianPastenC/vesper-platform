export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface OrderTimelineEvent {
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  timestamp: string;
  description: string;
}

export interface Order {
  id: string;
  status: 'processing' | 'shipped' | 'delivered' | 'cancelled';
  date: string;
  total: number;
  items: OrderItem[];
  timeline: OrderTimelineEvent[];
}

// Mock robust data
export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-9823-XYZ',
    status: 'delivered',
    date: '2023-10-15T14:30:00Z',
    total: 450.0,
    items: [
      { id: '1', name: 'Leather Weekender', qty: 1, price: 350.0 },
      { id: '2', name: 'Premium Care Kit', qty: 2, price: 50.0 },
    ],
    timeline: [
      {
        status: 'processing',
        timestamp: '2023-10-12T09:00:00Z',
        description: 'Order confirmed and processing',
      },
      {
        status: 'shipped',
        timestamp: '2023-10-13T10:15:00Z',
        description: 'Package handed to courier',
      },
      {
        status: 'delivered',
        timestamp: '2023-10-15T14:30:00Z',
        description: 'Delivered to simulated address',
      },
    ],
  },
  {
    id: 'ORD-1029-ABC',
    status: 'processing',
    date: '2023-11-20T08:45:00Z',
    total: 120.0,
    items: [{ id: '3', name: 'Silk Blend Shirt', qty: 1, price: 120.0 }],
    timeline: [
      {
        status: 'processing',
        timestamp: '2023-11-20T08:45:00Z',
        description: 'Payment verified, preparing shipment',
      },
    ],
  },
  {
    id: 'ORD-3341-QWE',
    status: 'shipped',
    date: '2023-11-18T16:20:00Z',
    total: 85.0,
    items: [{ id: '4', name: 'Cashmere Beanie', qty: 1, price: 85.0 }],
    timeline: [
      { status: 'processing', timestamp: '2023-11-18T16:20:00Z', description: 'Order confirmed' },
      {
        status: 'shipped',
        timestamp: '2023-11-19T11:00:00Z',
        description: 'In transit to destination facility',
      },
    ],
  },
  {
    id: 'ORD-5501-LMN',
    status: 'cancelled',
    date: '2023-09-05T10:00:00Z',
    total: 210.0,
    items: [{ id: '5', name: 'Limited Edition Sneakers', qty: 1, price: 210.0 }],
    timeline: [
      { status: 'processing', timestamp: '2023-09-05T10:00:00Z', description: 'Order received' },
      {
        status: 'cancelled',
        timestamp: '2023-09-06T09:00:00Z',
        description: 'Cancelled by customer request',
      },
    ],
  },
];
