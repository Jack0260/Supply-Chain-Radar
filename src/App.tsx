import { ThemeProvider } from '@/lib/theme';
import { Layout } from '@/components/Layout';
import { useRouter } from '@/lib/router';
import { DashboardPage } from '@/pages/DashboardPage';
import { GraphPage } from '@/pages/GraphPage';
import { FindingsPage } from '@/pages/FindingsPage';
import { FindingDetailPage } from '@/pages/FindingDetailPage';
import { PackagesPage } from '@/pages/PackagesPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { UploadPage } from '@/pages/UploadPage';
import { AuditPage } from '@/pages/AuditPage';

function PageRouter() {
  const { route } = useRouter();

  switch (route.name) {
    case 'dashboard': return <DashboardPage />;
    case 'graph': return <GraphPage />;
    case 'findings': return <FindingsPage />;
    case 'finding': return <FindingDetailPage id={route.id} />;
    case 'packages': return <PackagesPage />;
    case 'services': return <ServicesPage />;
    case 'tickets': return <TicketsPage />;
    case 'upload': return <UploadPage />;
    case 'audit': return <AuditPage />;
    default: return <DashboardPage />;
  }
}

function App() {
  return (
    <ThemeProvider>
      <Layout>
        <PageRouter />
      </Layout>
    </ThemeProvider>
  );
}

export default App;
