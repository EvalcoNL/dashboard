import DataHealthClient from './DataHealthClient';

export const metadata = {
    title: 'Data Health | Evalco Dashboard',
    description: 'Monitor the health and sync status of all data connections',
};

export default function DataHealthPage() {
    return <DataHealthClient />;
}
