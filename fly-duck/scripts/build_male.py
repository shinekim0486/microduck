import pyarrow.feather as f, pyarrow as pa, pyarrow.compute as pc, numpy as np, json, gzip, struct, collections, time
t0=time.time()
A=f.read_table('annotations.feather').to_pydict()
n_all=len(A['bodyId'])
body=np.array(A['bodyId'],dtype=np.uint64)
sup=np.array([s or '' for s in A['superclass']]); cls=np.array([s or '' for s in A['class']]); status=np.array([s or '' for s in A['status']])
retain=(sup!='')&(status!='Glia')
order=np.argsort(body[retain],kind='stable'); ids=body[retain][order]
sel=np.flatnonzero(retain)[order]           # annotation row for each node
n=len(ids); print("nodes",n,"(of",n_all,")",flush=True)
def col(name): return np.array([A[name][i] for i in sel],dtype=object)
sup_n, cls_n = sup[sel], cls[sel]
somaSide=col('somaSide'); rootSide=col('rootSide'); entry=col('entryNerve'); typ=col('type')
soma=np.full((n,3),np.nan,dtype=np.float64)
for k,i in enumerate(sel):
    p=A['somaLocation'][i]
    if p is not None and len(p)==3: soma[k]=p
soma*=8.0  # voxel (8 nm) -> nm
has=~np.isnan(soma[:,0]); print("with soma",has.sum(),flush=True)
mid=np.nanmedian(soma[:,0])
side=np.array(['']*n,dtype=object)
for k in range(n):
    s=somaSide[k] if somaSide[k] in ('L','R') else (rootSide[k] if rootSide[k] in ('L','R') else '')
    if not s and isinstance(entry[k],str) and entry[k][-2:] in ('_L','_R'): s=entry[k][-1]
    if not s and has[k]: s='L' if soma[k,0]<mid else 'R'   # 좌표로 추정 (표시용)
    side[k]={'L':'left','R':'right'}.get(s,'')
print("side counts",collections.Counter(side),flush=True)
# ---- channels (원작 FlyWire 채널명과 동일하게) ----
ch=collections.defaultdict(list)
mech={'mechanosensory','mechanosensory_tactile','mechanosensory_proprioceptive'}
for k in range(n):
    s=side[k]; c=cls_n[k]; S=sup_n[k]
    if not s: continue
    if c=='visual' or S=='ol_sensory': ch[f'visual_{s}'].append(k)
    if c=='olfactory': ch[f'olfactory_{s}'].append(k)
    if c in mech and S=='cb_sensory': ch[f'mechanosensory_{s}'].append(k)
    if S=='descending_neuron': ch[f'descending_{s}'].append(k)
    if c in ('ALPN','CX','LHLN','LHCENT','Kenyon_Cell','MBON','DAN','gustatory'): ch[f'{c}_{s}'].append(k)
    if S in ('vnc_motor','cb_motor'): ch[f'motor_{s}'].append(k)
    if S=='vnc_sensory': ch[f'vnc_sensory_{s}'].append(k)
print({k:len(v) for k,v in sorted(ch.items())},flush=True)
grp=np.full(n,3,dtype=np.uint8)
for k in range(n):
    S=sup_n[k]
    if S in ('cb_sensory','ol_sensory','sensory_ascending','vnc_sensory'): grp[k]=1
    elif S=='ol_intrinsic': grp[k]=2
    elif S=='descending_neuron': grp[k]=4
    elif S.startswith('vnc_'): grp[k]=0
# ---- neurotransmitter sign ----
NT=f.read_table('neurotransmitters.feather',columns=['body','consensus_nt']).to_pydict()
ntmap=dict(zip(NT['body'],NT['consensus_nt']))
sign=np.array([-1.0 if ntmap.get(int(b))=='gaba' else 1.0 for b in ids],dtype=np.float32)
print("gaba nodes",(sign<0).sum(),"| nt known",sum(1 for b in ids if ntmap.get(int(b)) not in (None,'unclear')),flush=True)
# ---- edges ----
E=f.read_table('edges.feather'); print("edge columns",E.column_names,E.num_rows,flush=True)
pre=E.column(E.column_names[0]).to_numpy().astype(np.uint64); post=E.column(E.column_names[1]).to_numpy().astype(np.uint64); w=E.column('weight').to_numpy().astype(np.float64)
i=np.searchsorted(ids,pre); j=np.searchsorted(ids,post)
keep=(i<n)&(j<n); keep&=ids[np.minimum(i,n-1)]==pre; keep&=ids[np.minimum(j,n-1)]==post
i,j,w=i[keep],j[keep],w[keep]; print("edges between retained nodes",len(w),"synapses",int(w.sum()),flush=True)
for T in (1,2,3,4,5,6,8,10): print(f"  threshold>={T}: edges {(w>=T).sum():,} synapses kept {int(w[w>=T].sum()):,} ({w[w>=T].sum()/w.sum()*100:.1f}%)",flush=True)
T=next(T for T in (1,2,3,4,5,6,8,10,12,15,20) if (w>=T).sum()<=3_200_000)
m=w>=T; i,j,w=i[m],j[m],w[m]; print("chosen threshold",T,"edges",len(w),flush=True)
o=np.lexsort((j,i)); i,j,w=i[o].astype(np.uint32),j[o].astype(np.uint32),(w[o]*sign[i[o]]).astype(np.float32)
# ---- positions: soma; missing -> mean of neighbours' soma; else global mean ----
pos=soma.copy()
missing=np.isnan(pos[:,0]); print("missing soma",missing.sum(),flush=True)
acc=np.zeros((n,3)); cnt=np.zeros(n)
srcok=~missing[i]; np.add.at(acc,j[srcok],pos[i[srcok]]); np.add.at(cnt,j[srcok],1)
dstok=~missing[j]; np.add.at(acc,i[dstok],pos[j[dstok]]); np.add.at(cnt,i[dstok],1)
fill=missing&(cnt>0); pos[fill]=acc[fill]/cnt[fill][:,None]
still=np.isnan(pos[:,0]); pos[still]=np.nanmean(soma,axis=0); print("filled by neighbours",fill.sum(),"global",still.sum(),flush=True)
# ---- write ----
import os; os.makedirs('out/anatomy',exist_ok=True)
ed=np.empty(len(w),dtype=[('a','<u4'),('b','<u4'),('w','<f4')]); ed['a']=i; ed['b']=j; ed['w']=w
raw=struct.pack('<II',n,len(w))+ed.tobytes()+bytes(3*n)
with gzip.open('out/connectome.bin.gz','wb',compresslevel=9) as g: g.write(raw)
pos.astype('<f4').tofile('out/anatomy/positions.bin')
meta={'name':'MaleCNS v1.0','sex':'male','neurons':int(n),'edges':int(len(w)),'synapses_kept':int(abs(w).sum()),'edge_threshold':int(T),'source':'https://male-cns.janelia.org/download/','paper':'https://doi.org/10.1016/j.cell.2026.08.015','license':'CC-BY 4.0','side_rule':'somaSide > rootSide > entryNerve > soma x vs midline','sign_rule':'consensus_nt gaba negative, others positive (same as FlyWire graph)','positions_rule':'soma (8nm voxel x8 -> nm); missing -> mean of synaptic partners soma; else global mean','missing_soma':int(missing.sum())}
json.dump({'channels':{k:v for k,v in ch.items()},'displayGroups':grp.tolist(),'meta':meta},open('out/channels.json','w'),separators=(',',':'))
json.dump(meta,open('out/meta.json','w'),indent=1,ensure_ascii=False)
print("wrote out/ in %.0fs"%(time.time()-t0)); print(json.dumps(meta,ensure_ascii=False))
print("sizes:",{f:os.path.getsize('out/'+f)//1024 for f in ['connectome.bin.gz','channels.json','anatomy/positions.bin']},"KB")
