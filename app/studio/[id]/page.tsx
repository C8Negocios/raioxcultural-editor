"use client";
import { use } from 'react';
import dynamic from 'next/dynamic';

const StudioEditor = dynamic(() => import('../StudioEditor'), { ssr: false });

export default function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const funnelId = unwrappedParams.id;
  
  return (
    <div style={{ height: "calc(100vh - 64px)", width: "100%", overflow: "hidden", margin: 0, padding: 0 }}>
      {/* Container fluido que respeita o width da Main e os paddings sem vazar para a lateral */}
      <StudioEditor funnelId={funnelId} />
    </div>
  );
}
