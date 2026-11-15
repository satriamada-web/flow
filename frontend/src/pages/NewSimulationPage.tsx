import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Check, FileBox, FileUp, Gauge, Thermometer, Trash2 } from 'lucide-react';

type Solver = 'fea_classic' | 'thermal_classic';
const stages = ['Project', 'Physics & geometry', 'Review'];
const NewSimulationPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [solver, setSolver] = useState<Solver>('fea_classic');
  const [file, setFile] = useState<File | null>(null);
  const [nx, setNx] = useState('30');
  const [ny, setNy] = useState('20');
  const [creating, setCreating] = useState(false);

  const createProject = async () => {
    if (!name.trim() || !file) return;
    setCreating(true);
    try {
      const parameters = { nx: Number(nx), ny: Number(ny) };
      const response = await fetch('/api/v1/simulations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), solver, parameters }),
      });
      if (!response.ok) throw new Error('Project creation failed');
      const project = await response.json();
      const data = new FormData();
      data.append('file', file);
      const upload = await fetch('/api/v1/simulations/' + project.id + '/upload', { method: 'POST', body: data });
      if (!upload.ok) {
        const detail = await upload.json().catch(() => null);
        toast.error(detail?.detail || 'Project created, but geometry upload failed');
        navigate('/simulations/' + project.id);
        return;
      }
      toast.success('Project created successfully');
      navigate('/simulations/' + project.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create project');
    } finally {
      setCreating(false);
    }
  };

  const stages = ['Project', 'Physics & geometry', 'Review'];
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 md:px-8 md:py-9">
      <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><ArrowLeft size={15} /> Back to workspace</button>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Project setup</p>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950">Create simulation</h1>
      <p className="mt-2 text-sm text-slate-500">Follow the setup stages to prepare your engineering project.</p>

      <div className="my-8 grid grid-cols-3 gap-2">
        {stages.map((label, index) => <div key={label}>
          <div className={'mb-2 h-1 rounded-full ' + (index <= step ? 'bg-blue-600' : 'bg-slate-200')} />
          <div className="flex items-center gap-2">
            <span className={'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ' + (index < step ? 'bg-blue-600 text-white' : index === step ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400')}>{index < step ? <Check size={13} /> : index + 1}</span>
            <span className={'text-[11px] font-semibold ' + (index === step ? 'text-slate-900' : 'text-slate-400')}>{label}</span>
          </div>
        </div>)}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_270px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          {step === 0 && <div>
            <h2 className="mb-1 text-base font-bold text-slate-900">Project information</h2>
            <p className="mb-6 text-xs text-slate-400">Give your study a clear name.</p>
            <label className="mb-2 block text-xs font-semibold text-slate-700">Project name *</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={255} placeholder="e.g. Greenhouse airflow study" className="mb-5 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
            <label className="mb-2 block text-xs font-semibold text-slate-700">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="What do you want to investigate?" className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500" />
          </div>}

          {step === 1 && <div>
            <h2 className="mb-1 text-base font-bold text-slate-900">Physics and geometry</h2>
            <p className="mb-6 text-xs text-slate-400">Choose a currently implemented solver and import a model.</p>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button onClick={() => setSolver('fea_classic')} className={'rounded-xl border p-4 text-left ' + (solver === 'fea_classic' ? 'border-blue-500 bg-blue-50' : 'border-slate-200')}>
                <Gauge size={20} className="mb-3 text-blue-600" /><p className="text-sm font-bold">Structural · FEA</p><p className="mt-1 text-[11px] text-slate-500">Simplified 2D demonstration solver</p><span className="mt-3 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Available</span>
              </button>
              <button onClick={() => setSolver('thermal_classic')} className={'rounded-xl border p-4 text-left ' + (solver === 'thermal_classic' ? 'border-blue-500 bg-blue-50' : 'border-slate-200')}>
                <Thermometer size={20} className="mb-3 text-orange-600" /><p className="text-sm font-bold">Heat transfer</p><p className="mt-1 text-[11px] text-slate-500">Steady-state 2D conduction solver</p><span className="mt-3 inline-block rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Available</span>
              </button>
            </div>
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="mb-3 block text-xs font-bold text-slate-800">Geometry file *</label>
              <input id="geometry-upload" type="file" accept=".step,.stp,.iges,.igs,.stl,.obj,.msh,.vtk" onChange={e => setFile(e.target.files?.[0] || null)} className="sr-only" />
              {file ? <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white p-3"><div className="flex min-w-0 items-center gap-2"><FileBox size={18} className="shrink-0 text-blue-600" /><span className="truncate text-xs font-semibold">{file.name}</span></div><button onClick={() => setFile(null)} aria-label="Remove file" className="p-2 text-slate-400"><Trash2 size={15} /></button></div> :
                <label htmlFor="geometry-upload" className="flex cursor-pointer flex-col items-center rounded-lg border border-slate-200 bg-white px-4 py-7 text-center"><FileUp size={24} className="mb-2 text-blue-600" /><span className="text-xs font-semibold">Choose geometry file</span><span className="mt-1 text-[10px] text-slate-400">STEP, IGES, STL, OBJ, MSH, VTK</span></label>}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <label className="text-[11px] font-semibold text-slate-600">Mesh divisions X<input type="number" min="2" value={nx} onChange={e => setNx(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" /></label>
              <label className="text-[11px] font-semibold text-slate-600">Mesh divisions Y<input type="number" min="2" value={ny} onChange={e => setNy(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-xs" /></label>
            </div>
            <p className="mt-3 text-[10px] leading-4 text-slate-400">Important: the current backend stores the imported geometry, but the existing FEA and thermal solvers still use their own built-in 2D demonstration meshes.</p>
          </div>}

          {step === 2 && <div>
            <h2 className="mb-1 text-base font-bold text-slate-900">Review project</h2>
            <p className="mb-6 text-xs text-slate-400">Check the configuration before creating it.</p>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              <Review label="Project" value={name} />
              <Review label="Description" value={description || 'No description'} />
              <Review label="Physics" value={solver === 'fea_classic' ? 'Structural · FEA Classic' : 'Heat transfer · Thermal Classic'} />
              <Review label="Geometry" value={file?.name || 'No file selected'} />
              <Review label="Mesh parameters" value={nx + ' × ' + ny + ' divisions'} />
            </div>
            <div className="mt-4 rounded-xl bg-amber-50 p-4 text-xs leading-5 text-amber-800"><strong>Solver limitation:</strong> imported geometry is saved to the project but is not yet coupled to the current demonstration solver.</div>
          </div>}

          <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-5 sm:flex-row">
            <button onClick={() => step === 0 ? navigate(-1) : setStep(step - 1)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-600">{step === 0 ? 'Cancel' : <><ArrowLeft size={14} /> Previous</>}</button>
            {step < 2 ? <button onClick={() => setStep(step + 1)} disabled={step === 0 ? !name.trim() : !file} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">Continue <ArrowRight size={14} /></button> :
              <button onClick={createProject} disabled={creating || !name.trim() || !file} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white disabled:opacity-40">{creating ? 'Creating project…' : 'Create project'} <Check size={14} /></button>}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-[#14213a] p-5 text-white"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-300">Setup progress</p><p className="mt-3 text-2xl font-bold">{Math.round((step + 1) / 3 * 100)}%</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-blue-400" style={{ width: ((step + 1) / 3 * 100) + '%' }} /></div><p className="mt-3 text-[11px] leading-5 text-slate-400">Complete each stage to prepare your engineering study.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5"><h3 className="text-xs font-bold text-slate-800">Workflow stages</h3><ol className="mt-4 space-y-4">{stages.map((item, index) => <li key={item} className="flex items-center gap-3"><span className={'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ' + (index <= step ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400')}>{index < step ? <Check size={13} /> : index + 1}</span><span className="text-xs text-slate-600">{item}</span></li>)}</ol></div>
        </aside>
      </div>
    </div>
  );
};

const Review: React.FC<{ label: string; value: string }> = ({ label, value }) => <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:justify-between"><span className="text-[11px] text-slate-400">{label}</span><span className="break-all text-xs font-semibold text-slate-800 sm:max-w-[70%] sm:text-right">{value}</span></div>;
export default NewSimulationPage;
