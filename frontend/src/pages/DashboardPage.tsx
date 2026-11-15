import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, ArrowUpRight, CheckCircle2, Clock,
  FolderKanban, Plus, RefreshCw, Zap,
} from 'lucide-react';

interface Simulation {
  id: string;
  name: string;
  solver: string;
  status: string;
  created_at: string;
  duration_seconds: number | null;
}
interface Stats { total: number; running: number; completed: number; failed: number; }

const DashboardPage: React.FC = () => {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchSimulations = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/v1/simulations/');
      if (!res.ok) throw new Error('Unable to load projects');
      const data = await res.json();
      setSimulations(data.simulations || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSimulations(); }, []);

  const stats: Stats = {
    total: simulations.length,
    running: simulations.filter((s) => s.status === 'running' || s.status === 'queued').length,
    completed: simulations.filter((s) => s.status === 'completed').length,
    failed: simulations.filter((s) => s.status === 'failed').length,
  };

  const cards = [
    { label: 'Total projects', value: stats.total, icon: FolderKanban, tone: 'text-blue-600 bg-blue-50' },
    { label: 'Running', value: stats.running, icon: Activity, tone: 'text-amber-600 bg-amber-50' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, tone: 'text-emerald-600 bg-emerald-50' },
    { label: 'Failed', value: stats.failed, icon: AlertTriangle, tone: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-9">
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Engineering workspace
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-[34px]">Simulation overview</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Manage engineering projects, configure physics, and review simulation runs from one workspace.</p>
        </div>
        <Link to="/simulations/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700">
          <Plus size={17} /> Create simulation
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/40 md:p-5">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{card.label}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}><Icon size={17} /></span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{loading ? '—' : card.value}</p>
              <p className="mt-1 text-[11px] text-slate-400">Current workspace</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent projects</h2>
              <p className="mt-1 text-xs text-slate-400">Your latest engineering simulation work</p>
            </div>
            <button onClick={fetchSimulations} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50" disabled={loading}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>

          {error ? (
            <div className="px-6 py-14 text-center">
              <AlertTriangle size={24} className="mx-auto mb-3 text-rose-500" />
              <p className="text-sm font-semibold text-slate-700">Could not load projects</p>
              <p className="mt-1 text-xs text-slate-400">Check the API connection, then try again.</p>
              <button onClick={fetchSimulations} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">Try again</button>
            </div>
          ) : loading ? (
            <div className="px-6 py-14 text-center text-sm text-slate-400">Loading projects…</div>
          ) : simulations.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><FolderKanban size={24} /></div>
              <p className="text-sm font-semibold text-slate-800">No projects yet</p>
              <p className="mt-1 text-xs text-slate-400">Create a project to start your first simulation workflow.</p>
              <Link to="/simulations/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white"><Plus size={14} /> Create first project</Link>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead><tr className="bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400"><th className="px-6 py-3">Project</th><th className="px-4 py-3">Physics / Solver</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Duration</th><th className="px-6 py-3">Created</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {simulations.map((sim) => <tr key={sim.id} className="transition hover:bg-slate-50/70">
                      <td className="px-6 py-4"><Link to={`/simulations/${sim.id}`} className="font-semibold text-slate-800 hover:text-blue-600">{sim.name}</Link><p className="mt-1 text-[10px] text-slate-400">ID · {sim.id.slice(0, 8)}</p></td>
                      <td className="px-4 py-4 text-xs text-slate-500">{sim.solver.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-4"><StatusBadge status={sim.status} /></td>
                      <td className="px-4 py-4 text-xs tabular-nums text-slate-500">{sim.duration_seconds ? `${sim.duration_seconds.toFixed(2)} s` : '—'}</td>
                      <td className="px-6 py-4 text-xs text-slate-500">{new Date(sim.created_at).toLocaleDateString()}</td>
                    </tr>)}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 md:hidden">
                {simulations.map((sim) => <Link key={sim.id} to={`/simulations/${sim.id}`} className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-slate-50">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-800">{sim.name}</p><p className="mt-1 text-[11px] capitalize text-slate-400">{sim.solver.replace(/_/g, ' ')} · {new Date(sim.created_at).toLocaleDateString()}</p></div>
                  <div className="flex shrink-0 items-center gap-2"><StatusBadge status={sim.status} /><ArrowUpRight size={15} className="text-slate-400" /></div>
                </Link>)}
              </div>
            </>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-[#14213a] p-5 text-white shadow-lg shadow-slate-900/10">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-300"><Zap size={19} /></div>
            <p className="text-sm font-bold">Start a new study</p>
            <p className="mt-2 text-xs leading-5 text-slate-400">Set up geometry, choose a physics interface, and prepare your simulation parameters.</p>
            <Link to="/simulations/new" className="mt-5 flex items-center justify-between rounded-xl bg-blue-600 px-4 py-3 text-xs font-semibold text-white transition hover:bg-blue-500">New simulation <ArrowUpRight size={15} /></Link>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/40">
            <div className="mb-3 flex items-center gap-2"><Clock size={15} className="text-slate-400" /><h3 className="text-xs font-bold text-slate-800">Workflow guide</h3></div>
            <ol className="space-y-3 text-xs text-slate-500">
              {['Create a project', 'Import geometry', 'Configure physics & materials', 'Generate mesh', 'Run and inspect results'].map((step, index) => <li key={step} className="flex items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">{String(index + 1).padStart(2, '0')}</span>{step}</li>)}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    created: 'bg-slate-100 text-slate-600', queued: 'bg-amber-50 text-amber-700',
    running: 'bg-blue-50 text-blue-700', completed: 'bg-emerald-50 text-emerald-700',
    failed: 'bg-rose-50 text-rose-700', cancelled: 'bg-orange-50 text-orange-700',
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${styles[status] || styles.created}`}>{status}</span>;
};

export default DashboardPage;
