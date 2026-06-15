export interface StatCard {

  label: string;

  value: string;

  change: string;

  changePositive: boolean;

  icon: 'sales' | 'orders' | 'stock' | 'deliveries';

}



export interface QuickAction {

  label: string;

  description: string;

  route: string;

  color: string;

  icon: 'quotation' | 'purchase' | 'workorder' | 'reports';

}



export interface RecentActivity {

  id: string;

  module: string;

  reference: string;

  description: string;

  amount: string;

  status: string;

  date: string;

}


