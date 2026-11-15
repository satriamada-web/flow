import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Bounds, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import {
  Box, Check, Eye, EyeOff, FileUp, Grid3X3, Info,
  Scan, Triangle, UploadCloud,
} from 'lucide-react';

type GeometryAsset = {
  object: THREE.Object3D;
  name: string;
  format: 'OBJ' | 'STL';
  vertices: number;
  triangles: number;
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
        const buffer = await file.arrayBuffer();
        const geometry = new STLLoader().parse(buffer);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
          color: '#8bb7e8', metalness: 0.18, roughness: 0.48, side: THREE.DoubleSide,
        }));
        object = mesh;
        format = 'STL';
      } else if (extension === 'obj') {
        const source = await file.text();
        object = new OBJLoader().parse(source);
        format = 'OBJ';
      } else {
        throw new Error('Format belum didukung di viewer ini. Gunakan file .obj atau .stl.');
      }

      const bounds = new THREE.Box3().setFromObject(object);
      if (bounds.isEmpty()) throw new Error('File tidak berisi geometri 3D yang dapat dibaca.');
      const center = bounds.getCenter(new THREE.Vector3());
      object.position.sub(center);
      const counts = { vertices: 0, triangles: 0 };
      object.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          const geometry = node.geometry as THREE.BufferGeometry;
          counts.vertices += geometry.attributes.position?.count || 0;
          counts.triangles += geometry.index
            ? geometry.index.count / 3
            : (geometry.attributes.position?.count || 0) / 3;
        }
      });
      if (asset) asset.object.traverse((node) => {
        if (node instanceof THREE.Mesh) node.geometry.dispose();
      });
      setAsset({ object, name: file.name, format, ...counts });
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

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-[#f4f7fb]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 md:px-7">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">
            <Box size={14} /> Geometry workspace
          </div>
          <h1 className="mt-1 text-xl font-bold text-slate-900 md:text-2xl">3D Geometry Viewer</h1>
          <p className="mt-1 text-xs text-slate-500">Impor dan inspeksi model 3D sebelum menyiapkan mesh simulasi.</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={inputRef} type="file" accept=".obj,.stl" className="hidden" onChange={(e) => loadFile(e.target.files?.[0])} />
          <button onClick={() => inputRef.current?.click()} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60">
            <FileUp size={16} /> {busy ? 'Memuat...' : 'Import geometry'}
          </button>
          {asset && <button onClick={reset} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Clear</button>}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 p-3 md:grid-cols-[minmax(0,1fr)_280px] md:p-5">
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
            <h2 className="text-sm font-bold text-slate-900">Model information</h2>
            {asset ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="break-all text-xs font-semibold text-slate-800">{asset.name}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{asset.format} geometry · loaded locally</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] text-slate-500">Vertices</p><p className="mt-1 text-lg font-bold text-slate-900">{asset.vertices.toLocaleString()}</p></div>
                  <div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] text-slate-500">Triangles</p><p className="mt-1 text-lg font-bold text-slate-900">{Math.round(asset.triangles).toLocaleString()}</p></div>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-700"><Check size={14} /> Model berhasil dimuat</div>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-500">Belum ada model. Impor file untuk melihat informasi mesh dasar.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-bold text-slate-900">Display controls</h2>
            <div className="mt-3 space-y-2">
              <button onClick={() => setWireframe(!wireframe)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><span className="flex items-center gap-2"><Triangle size={15} /> Wireframe</span>{wireframe ? <Eye size={16} className="text-blue-600" /> : <EyeOff size={16} className="text-slate-400" />}</button>
              <button onClick={() => setShowGrid(!showGrid)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><span className="flex items-center gap-2"><Grid3X3 size={15} /> Reference grid</span>{showGrid ? <Eye size={16} className="text-blue-600" /> : <EyeOff size={16} className="text-slate-400" />}</button>
              <button onClick={() => setShowAxes(!showAxes)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 px-3 py-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><span className="flex items-center gap-2"><Scan size={15} /> Axis helper</span>{showAxes ? <Eye size={16} className="text-blue-600" /> : <EyeOff size={16} className="text-slate-400" />}</button>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2"><Info size={16} className="mt-0.5 shrink-0 text-amber-700" /><div><h3 className="text-xs font-bold text-amber-900">Status integrasi</h3><p className="mt-1 text-[11px] leading-5 text-amber-800">Viewer ini membaca OBJ/STL di browser. Model belum dikirim ke backend, belum menghasilkan volume mesh, dan belum terhubung ke solver FEA/CFD/thermal.</p></div></div>
          </div>
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">{error}</div>}
        </aside>
      </div>
    </div>
  );
};

export default GeometryWorkspace;
