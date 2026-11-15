import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import {
  Box, Check, Download, Eye, EyeOff, FileUp, Grid3X3, Info,
  Scan, Triangle, UploadCloud,
} from 'lucide-react';

type MeshAnalysis = {
  vertices: number;
  triangles: number;
  surfaceArea: number;
  dimensions: [number, number, number];
  boundaryEdges: number;
  nonManifoldEdges: number;
  degenerateTriangles: number;
};

type GeometryAsset = {
  object: THREE.Object3D;
  name: string;
  format: 'OBJ' | 'STL';
  analysis: MeshAnalysis;
};

const analyzeSurface = (object: THREE.Object3D): MeshAnalysis => {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  const size = bounds.getSize(new THREE.Vector3());
  const edgeUse = new Map<string, number>();
  const point = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  let vertices = 0;
  let triangles = 0;
  let surfaceArea = 0;
  let degenerateTriangles = 0;

  const vertexKey = (v: THREE.Vector3) =>
    [v.x, v.y, v.z].map((n) => Math.round(n * 1e6)).join(',');
  const addEdge = (v1: THREE.Vector3, v2: THREE.Vector3) => {
    const k1 = vertexKey(v1);
    const k2 = vertexKey(v2);
    const key = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
    edgeUse.set(key, (edgeUse.get(key) || 0) + 1);
  };

  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const geometry = node.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute('position');
    if (!position) return;
    const index = geometry.getIndex();
    const count = index ? index.count : position.count;
    vertices += position.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const i0 = index ? index.getX(i) : i;
      const i1 = index ? index.getX(i + 1) : i + 1;
      const i2 = index ? index.getX(i + 2) : i + 2;
      a.fromBufferAttribute(position, i0).applyMatrix4(node.matrixWorld);
      b.fromBufferAttribute(position, i1).applyMatrix4(node.matrixWorld);
      c.fromBufferAttribute(position, i2).applyMatrix4(node.matrixWorld);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      const area = ab.clone().cross(ac).length() * 0.5;
      triangles += 1;
      if (area < 1e-12) degenerateTriangles += 1;
      else surfaceArea += area;
      addEdge(a, b);
      addEdge(b, c);
      addEdge(c, a);
    }
  });

  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  edgeUse.forEach((uses) => {
    if (uses === 1) boundaryEdges += 1;
    if (uses > 2) nonManifoldEdges += 1;
  });

  return {
    vertices,
    triangles,
    surfaceArea,
    dimensions: [size.x, size.y, size.z],
    boundaryEdges,
    nonManifoldEdges,
    degenerateTriangles,
  };
};

const GeometryObject: React.FC<{ object: THREE.Object3D; wireframe: boolean }> = ({ object, wireframe }) => {
  const clone = useMemo(() => {
    const copy = object.clone(true);
    copy.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#8bb7e8',
          metalness: 0.18,
          roughness: 0.48,
          side: THREE.DoubleSide,
          wireframe,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return copy;
  }, [object, wireframe]);

  return <primitive object={clone} />;
};

const GeometryWorkspace: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [asset, setAsset] = useState<GeometryAsset | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (asset) asset.object.traverse((node) => {
      if (node instanceof THREE.Mesh) node.geometry.dispose();
    });
  }, [asset]);

  const loadFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let object: THREE.Object3D;
      let format: 'OBJ' | 'STL';
      if (extension === 'stl') {
        const geometry = new STLLoader().parse(await file.arrayBuffer());
        geometry.computeVertexNormals();
        object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
          color: '#8bb7e8', metalness: 0.18, roughness: 0.48, side: THREE.DoubleSide,
        }));
        format = 'STL';
      } else if (extension === 'obj') {
        object = new OBJLoader().parse(await file.text());
        format = 'OBJ';
      } else {
        throw new Error('Format belum didukung. Gunakan file .obj atau .stl.');
      }

      const bounds = new THREE.Box3().setFromObject(object);
      if (bounds.isEmpty()) throw new Error('File tidak berisi geometri 3D yang dapat dibaca.');
      const analysis = analyzeSurface(object);
      const center = bounds.getCenter(new THREE.Vector3());
      object.position.sub(center);
      object.updateMatrixWorld(true);

      setAsset({ object, name: file.name, format, analysis });
      setWireframe(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membaca file geometri.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setAsset(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const exportStl = () => {
    if (!asset) return;
    try {
      const exporter = new STLExporter();
      const output = exporter.parse(asset.object, { binary: true });
      const blob = new Blob([output], { type: 'model/stl' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = asset.name.replace(/\.[^.]+$/, '') + '-processed.stl';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Ekspor STL gagal. Coba muat ulang model lalu ulangi.');
    }
  };

  const isClosedCandidate = !!asset &&
    asset.analysis.boundaryEdges === 0 &&
    asset.analysis.nonManifoldEdges === 0 &&
    asset.analysis.degenerateTriangles === 0;

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-[#f4f7fb]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 md:px-7">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            <Box size={14} /> Geometry workspace
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">3D Geometry & Surface Mesh</h1>
          <p className="mt-1 text-xs text-slate-500">Impor, periksa kualitas permukaan, dan ekspor ulang geometri.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept=".obj,.stl" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
            <FileUp size={16} /> {busy ? 'Memproses...' : 'Import geometry'}
          </button>
          {asset && <button onClick={exportStl} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"><Download size={15} /> Export STL</button>}
          {asset && <button onClick={reset} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear</button>}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 p-3 md:grid-cols-[minmax(0,1fr)_300px] md:p-5">
        <section className="relative min-h-[58vh] overflow-hidden rounded-2xl border border-slate-200 bg-[#101827] shadow-sm md:min-h-[calc(100vh-160px)]">
          <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
            <span className="rounded-lg border border-white/10 bg-slate-900/75 px-3 py-2 text-[11px] font-medium text-slate-200 backdrop-blur">
              {asset ? asset.format + ' · ' + asset.name : '3D VIEWPORT'}
            </span>
          </div>
          <div className="absolute right-4 top-4 z-10 flex gap-2">
            <button title="Toggle grid" onClick={() => setShowGrid(!showGrid)} className={`rounded-lg border p-2.5 backdrop-blur ${showGrid ? 'border-blue-400/40 bg-blue-500/20 text-blue-200' : 'border-white/10 bg-slate-900/70 text-slate-400'}`}><Grid3X3 size={17} /></button>
            <button title="Toggle axes" onClick={() => setShowAxes(!showAxes)} className={`rounded-lg border p-2.5 backdrop-blur ${showAxes ? 'border-blue-400/40 bg-blue-500/20 text-blue-200' : 'border-white/10 bg-slate-900/70 text-slate-400'}`}><Scan size={17} /></button>
            <button title="Toggle wireframe" onClick={() => setWireframe(!wireframe)} className={`rounded-lg border p-2.5 backdrop-blur ${wireframe ? 'border-blue-400/40 bg-blue-500/20 text-blue-200' : 'border-white/10 bg-slate-900/70 text-slate-400'}`}><Triangle size={17} /></button>
          </div>

          <Canvas shadows dpr={[1, 1.7]}>
            <PerspectiveCamera makeDefault position={[5, 4, 6]} fov={42} />
            <color attach="background" args={['#101827']} />
            <ambientLight intensity={1.05} />
            <directionalLight position={[6, 8, 5]} intensity={2.1} castShadow />
            <directionalLight position={[-5, 2, -4]} intensity={0.7} />
            {showGrid && <Grid args={[30, 30]} cellSize={1} cellThickness={0.6} cellColor="#334155" sectionSize={5} sectionThickness={1.1} sectionColor="#64748b" fadeDistance={28} infiniteGrid />}
            {showAxes && <axesHelper args={[3]} />}
            {asset && <Bounds fit clip observe margin={1.35}><GeometryObject object={asset.object} wireframe={wireframe} /></Bounds>}
            <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={0.2} maxDistance={500} />
          </Canvas>

          {!asset && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
              <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-blue-300"><UploadCloud size={30} /></div>
                <h2 className="text-lg font-semibold text-white">Mulai dari model 3D</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">Pilih file OBJ atau STL dari perangkat. Putar dengan satu jari, zoom dengan pinch, dan geser untuk mengatur tampilan.</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 rounded-lg border border-white/10 bg-slate-900/75 px-3 py-2 text-[10px] text-slate-400 backdrop-blur">
            Drag: rotate · Pinch/scroll: zoom · Right drag: pan
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">Surface mesh diagnostics</h2>
            {asset ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="break-all text-xs font-semibold text-slate-800">{asset.name}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{asset.format} · {asset.analysis.vertices.toLocaleString()} vertices · {asset.analysis.triangles.toLocaleString()} triangles</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Surface area" value={asset.analysis.surfaceArea.toFixed(3)} />
                  <Metric label="Triangles" value={asset.analysis.triangles.toLocaleString()} />
                  <Metric label="Boundary edges" value={asset.analysis.boundaryEdges.toLocaleString()} />
                  <Metric label="Non-manifold" value={asset.analysis.nonManifoldEdges.toLocaleString()} />
                  <Metric label="Degenerate faces" value={asset.analysis.degenerateTriangles.toLocaleString()} />
                  <Metric label="Vertices" value={asset.analysis.vertices.toLocaleString()} />
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Bounding dimensions</p>
                  <p className="mt-2 text-xs font-semibold tabular-nums text-slate-800">X {asset.analysis.dimensions[0].toFixed(3)} · Y {asset.analysis.dimensions[1].toFixed(3)} · Z {asset.analysis.dimensions[2].toFixed(3)}</p>
                  <p className="mt-1 text-[10px] text-slate-400">Unit mengikuti unit file sumber.</p>
                </div>
                <div className={`flex items-start gap-2 rounded-xl p-3 text-xs ${isClosedCandidate ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  {isClosedCandidate ? <Check size={15} className="mt-0.5 shrink-0" /> : <Info size={15} className="mt-0.5 shrink-0" />}
                  <span>{isClosedCandidate ? 'Permukaan lolos pemeriksaan edge dasar dan berpotensi menjadi domain tertutup.' : 'Permukaan memiliki edge terbuka, edge non-manifold, atau face degenerat. Perlu perbaikan sebelum volume meshing.'}</span>
                </div>
              </div>
            ) : <p className="mt-3 text-xs leading-5 text-slate-500">Impor model untuk menghitung statistik dan pemeriksaan topologi permukaan.</p>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">Display controls</h2>
            <div className="mt-3 space-y-2">
              <Toggle label="Wireframe" active={wireframe} onClick={() => setWireframe(!wireframe)} icon={<Triangle size={15} />} />
              <Toggle label="Reference grid" active={showGrid} onClick={() => setShowGrid(!showGrid)} icon={<Grid3X3 size={15} />} />
              <Toggle label="Axis helper" active={showAxes} onClick={() => setShowAxes(!showAxes)} icon={<Scan size={15} />} />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2"><Info size={16} className="mt-0.5 shrink-0 text-amber-700" /><div><h3 className="text-xs font-bold text-amber-900">Batas tahap ini</h3><p className="mt-1 text-[11px] leading-5 text-amber-800">Pemeriksaan ini menganalisis surface mesh dan ekspor STL. Ini belum memperbaiki otomatis geometri, membuat tetrahedral volume mesh, atau menjalankan solver fisika.</p></div></div>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</div>}
        </aside>
      </div>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl border border-slate-100 p-3">
    <p className="text-[10px] text-slate-500">{label}</p>
    <p className="mt-1 text-base font-bold tabular-nums text-slate-900">{value}</p>
  </div>
);

const Toggle: React.FC<{ label: string; active: boolean; onClick: () => void; icon: React.ReactNode }> = ({ label, active, onClick, icon }) => (
  <button onClick={onClick} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50">
    <span className="flex items-center gap-2">{icon}{label}</span>
    {active ? <Eye size={16} className="text-blue-600" /> : <EyeOff size={16} className="text-slate-400" />}
  </button>
);

export default GeometryWorkspace;
