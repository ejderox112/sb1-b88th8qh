import React, { useState } from 'react';

type Graph = {
  floor?: any;
  nodes: any[];
  edges: any[];
  pois: any[];
};

async function fetchGraph(url: string, key: string, floorId: string): Promise<Graph> {
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const floorRes = await fetch(`${url}/rest/v1/floors?id=eq.${floorId}&select=*`, { headers });
  if (!floorRes.ok) throw new Error('floor fetch failed');
  const floors = await floorRes.json();
  const nodesRes = await fetch(`${url}/rest/v1/nav_nodes?floor_id=eq.${floorId}&select=*`, { headers });
  const edgesRes = await fetch(`${url}/rest/v1/nav_edges?floor_id=eq.${floorId}&select=*`, { headers });
  const poisRes = await fetch(`${url}/rest/v1/pois?floor_id=eq.${floorId}&select=*`, { headers });
  if (!nodesRes.ok || !edgesRes.ok || !poisRes.ok) throw new Error('graph fetch failed');
  return {
    floor: floors?.[0],
    nodes: await nodesRes.json(),
    edges: await edgesRes.json(),
    pois: await poisRes.json(),
  };
}

async function exportRevision(url: string, key: string, floorId: string, payload: any) {
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const res = await fetch(`${url}/rest/v1/floor_revisions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ floor_id: floorId, payload, note: 'corridor-editor export', published: false }),
  });
  if (!res.ok) throw new Error('export failed');
}

export default function SupabaseSync() {
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [floorId, setFloorId] = useState('');
  const [status, setStatus] = useState('');
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!url || !key || !floorId) {
      setStatus('url/key/floorId gerekli');
      return;
    }
    setLoading(true);
    setStatus('Yükleniyor...');
    try {
      const g = await fetchGraph(url.trim(), key.trim(), floorId.trim());
      setGraph(g);
      setStatus(`Alındı: nodes ${g.nodes.length}, edges ${g.edges.length}, pois ${g.pois.length}`);
    } catch (err: any) {
      setStatus(err?.message || 'Hata');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!graph) {
      setStatus('Önce import');
      return;
    }
    setLoading(true);
    setStatus('Gönderiliyor...');
    try {
      await exportRevision(url.trim(), key.trim(), floorId.trim(), graph);
      setStatus('Revizyon kaydedildi (floor_revisions)');
    } catch (err: any) {
      setStatus(err?.message || 'Hata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '12px', background: '#0f172a', color: '#e2e8f0', borderRadius: 8, marginTop: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Supabase Import/Export</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <input style={inputStyle} placeholder="SUPABASE_URL" value={url} onChange={(e) => setUrl(e.target.value)} />
        <input style={inputStyle} placeholder="SUPABASE_SERVICE_ROLE" value={key} onChange={(e) => setKey(e.target.value)} />
        <input style={inputStyle} placeholder="floor_id" value={floorId} onChange={(e) => setFloorId(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
        <button style={buttonStyle} onClick={handleImport} disabled={loading}>Import</button>
        <button style={buttonStyle} onClick={handleExport} disabled={loading}>Export Revision</button>
      </div>
      <div style={{ fontSize: 12 }}>{status}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1e293b',
  color: '#e2e8f0',
  border: '1px solid #334155',
  padding: '8px',
  borderRadius: 6,
  minWidth: '180px',
};

const buttonStyle: React.CSSProperties = {
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  padding: '10px 12px',
  borderRadius: 6,
  cursor: 'pointer',
};
