import React from 'react';
import {
  Users, Plus, Trash2, Mail, UserPlus, BookOpen,
  ChevronDown, ChevronUp, CheckCircle2, X, Send
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Group {
  id: number;
  name: string;
  description?: string;
  created_by: string;
  created_at: string;
  memberCount?: number;
}

interface Member {
  id: number;
  user_id: string;
  joined_at: string;
  profile?: { full_name?: string; email?: string; avatar_url?: string };
}

export default function Gestion() {
  const { userId, isTeacher } = useAuth();

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expandedGroup, setExpandedGroup] = React.useState<number | null>(null);
  const [members, setMembers] = React.useState<Record<number, Member[]>>({});
  const [loadingMembers, setLoadingMembers] = React.useState<number | null>(null);

  // Create group form
  const [showCreateForm, setShowCreateForm] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [newGroupDesc, setNewGroupDesc] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  // Add member form (per-group)
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [invitingFor, setInvitingFor] = React.useState<number | null>(null);
  const [inviting, setInviting] = React.useState(false);
  const [inviteResult, setInviteResult] = React.useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Assign group to case
  const [assigningGroup, setAssigningGroup] = React.useState<number | null>(null);
  const [selectedCase, setSelectedCase] = React.useState<number | ''>('');
  const [assigning, setAssigning] = React.useState(false);
  const [cases, setCases] = React.useState<{ id: number; title: string }[]>([]);

  React.useEffect(() => {
    if (!userId) return;
    loadGroups();
    loadCases();
  }, [userId]);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from as any)('courses')
        .select('id, name, description, created_by, created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows: Group[] = (data as any[]) ?? [];
      const withCounts = await Promise.all(rows.map(async (g) => {
        try {
          const { count } = await (supabase.from as any)('course_members')
            .select('id', { count: 'exact', head: true }).eq('course_id', g.id);
          return { ...g, memberCount: count ?? 0 };
        } catch { return { ...g, memberCount: 0 }; }
      }));
      setGroups(withCounts);
    } catch (e: any) { console.warn('load groups:', e); }
    finally { setLoading(false); }
  };

  const loadCases = async () => {
    try {
      const { data } = await (supabase.from as any)('clinical_cases')
        .select('id, title').eq('created_by', userId).order('created_at', { ascending: false });
      setCases((data as any[]) ?? []);
    } catch { /* ok */ }
  };

  const loadMembers = async (groupId: number) => {
    if (members[groupId]) return;
    setLoadingMembers(groupId);
    try {
      const { data } = await (supabase.from as any)('course_members')
        .select('id, user_id, joined_at').eq('course_id', groupId).order('joined_at', { ascending: false });
      const rows: Member[] = (data as any[]) ?? [];
      const uids = rows.map((r) => r.user_id).filter(Boolean);
      let profileMap: Record<string, any> = {};
      if (uids.length > 0) {
        const { data: profs } = await (supabase.from as any)('profiles')
          .select('id, full_name, email, avatar_url').in('id', uids);
        ((profs as any[]) ?? []).forEach((p: any) => { profileMap[p.id] = p; });
      }
      setMembers((prev) => ({ ...prev, [groupId]: rows.map((r) => ({ ...r, profile: profileMap[r.user_id] ?? {} })) }));
    } catch (e) { console.warn('load members:', e); }
    finally { setLoadingMembers(null); }
  };

  const toggleExpand = (groupId: number) => {
    if (expandedGroup === groupId) { setExpandedGroup(null); return; }
    setExpandedGroup(groupId);
    setInviteEmail('');
    setInviteResult(null);
    loadMembers(groupId);
  };

  const createGroup = async () => {
    if (!newGroupName.trim() || !userId) return;
    setCreating(true);
    try {
      const { data, error } = await (supabase.from as any)('courses')
        .insert({ name: newGroupName.trim(), description: newGroupDesc.trim() || null, created_by: userId })
        .select().single();
      if (error) throw error;
      setGroups((prev) => [{ ...data, memberCount: 0 }, ...prev]);
      setNewGroupName(''); setNewGroupDesc(''); setShowCreateForm(false);
    } catch (e: any) { alert('Error creando grupo: ' + (e?.message ?? String(e))); }
    finally { setCreating(false); }
  };

  const deleteGroup = async (groupId: number) => {
    if (!confirm('¿Eliminar este grupo? Se desvinculará de todos sus miembros.')) return;
    try {
      await (supabase.from as any)('courses').delete().eq('id', groupId);
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (expandedGroup === groupId) setExpandedGroup(null);
    } catch (e: any) { alert('Error eliminando grupo: ' + (e?.message ?? String(e))); }
  };

  const inviteMember = async (groupId: number) => {
    if (!inviteEmail.trim()) return;
    setInviting(true); setInvitingFor(groupId); setInviteResult(null);
    try {
      const { data: prof, error: profErr } = await (supabase.from as any)('profiles')
        .select('id, full_name, email').ilike('email', inviteEmail.trim()).limit(1).maybeSingle();
      console.log('[inviteMember] prof:', prof, 'error:', profErr);
      if (!prof) {
        const hint = profErr ? ` (DB error: ${profErr.message})` : '';
        setInviteResult({ type: 'err', msg: `No se encontró ningún usuario con el correo "${inviteEmail.trim()}".${hint} Si el error menciona RLS o permisos, ejecuta db/fix_profiles_rls.sql en Supabase.` });
        return;
      }
      const { error: memErr } = await (supabase.from as any)('course_members')
        .insert({ course_id: groupId, user_id: prof.id }).select();
      if (memErr) {
        setInviteResult({ type: 'err', msg: memErr.code === '23505' ? 'Este usuario ya es miembro del grupo.' : memErr.message });
        return;
      }
      const group = groups.find((g) => g.id === groupId);
      await (supabase.from as any)('notifications').insert({
        user_id: prof.id,
        title: 'Te han añadido a un grupo',
        message: `Has sido añadido al grupo "${group?.name ?? 'Sin nombre'}" por tu instructor.`,
        is_read: false,
        course_id: groupId,
      });
      setInviteResult({ type: 'ok', msg: `✅ ${prof.full_name ?? prof.email} fue añadido al grupo y notificado.` });
      setInviteEmail('');
      setMembers((prev) => { const c = { ...prev }; delete c[groupId]; return c; });
      loadMembers(groupId);
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, memberCount: (g.memberCount ?? 0) + 1 } : g));
    } catch (e: any) { setInviteResult({ type: 'err', msg: 'Error: ' + (e?.message ?? String(e)) }); }
    finally { setInviting(false); }
  };

  const removeMember = async (groupId: number, memberId: number) => {
    if (!confirm('¿Quitar a este miembro del grupo?')) return;
    try {
      await (supabase.from as any)('course_members').delete().eq('id', memberId);
      setMembers((prev) => ({ ...prev, [groupId]: (prev[groupId] ?? []).filter((m) => m.id !== memberId) }));
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, memberCount: Math.max(0, (g.memberCount ?? 1) - 1) } : g));
    } catch (e: any) { alert('Error: ' + (e?.message ?? String(e))); }
  };

  const assignGroupToCase = async (groupId: number) => {
    if (!selectedCase) return;
    setAssigning(true);
    try {
      if (!members[groupId]) await loadMembers(groupId);
      const memberList = members[groupId] ?? [];
      if (memberList.length === 0) { alert('Este grupo no tiene miembros aún.'); return; }

      await (supabase.from as any)('case_assignments')
        .insert(memberList.map((m) => ({ case_id: selectedCase, user_id: m.user_id })));

      const caseTitle = cases.find((c) => c.id === selectedCase)?.title ?? 'un caso clínico';
      await (supabase.from as any)('notifications').insert(
        memberList.map((m) => ({
          user_id: m.user_id,
          title: 'Nuevo caso asignado',
          message: `Tu grupo fue asignado al caso "${caseTitle}".`,
          is_read: false,
          case_id: selectedCase,
        }))
      );
      alert(`✅ Grupo asignado a "${caseTitle}" y ${memberList.length} miembro(s) notificado(s).`);
      setAssigningGroup(null); setSelectedCase('');
    } catch (e: any) { alert('Error: ' + (e?.message ?? String(e))); }
    finally { setAssigning(false); }
  };

  if (!isTeacher) return (
    <div className="flex items-center justify-center h-64 text-secondary text-sm">
      Esta sección es solo para instructores.
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-serif font-black text-on-background tracking-tight">Gestión</h1>
          <p className="text-secondary mt-1">Administra tus grupos y asígnalos a casos clínicos.</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm hover:brightness-110 transition-all shadow-sm"
        >
          <Plus size={16} /> Nuevo grupo
        </button>
      </div>

      {/* Create group modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setShowCreateForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-serif font-black">Nuevo grupo</h2>
              <button onClick={() => setShowCreateForm(false)} className="text-secondary hover:text-on-background transition-colors"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest block mb-1">Nombre del grupo *</label>
                <input
                  value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Ej. Grupo A — Cardiología 2026"
                  className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest block mb-1">Descripción (opcional)</label>
                <textarea
                  value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)}
                  rows={3} placeholder="Descripción del grupo..."
                  className="w-full border border-outline-variant/30 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreateForm(false)} className="flex-1 py-3 border rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">Cancelar</button>
              <button
                onClick={createGroup} disabled={creating || !newGroupName.trim()}
                className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {creating ? 'Creando...' : 'Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Groups list */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin h-8 w-8 rounded-full border-b-2 border-primary" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm p-16 text-center space-y-3">
          <Users size={40} className="text-outline mx-auto" />
          <p className="text-secondary text-sm">No tienes grupos creados aún.</p>
          <button onClick={() => setShowCreateForm(true)} className="text-primary text-sm font-bold hover:underline">Crear mi primer grupo →</button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden">
              {/* Group header row */}
              <div className="px-6 py-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Users size={18} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-on-background">{group.name}</p>
                  {group.description && <p className="text-xs text-secondary truncate mt-0.5">{group.description}</p>}
                </div>
                <span className="text-xs text-secondary bg-surface-container px-3 py-1 rounded-full font-bold shrink-0">
                  {group.memberCount ?? 0} miembro{group.memberCount !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={() => { setAssigningGroup(assigningGroup === group.id ? null : group.id); setSelectedCase(''); }}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors shrink-0"
                >
                  <BookOpen size={13} /> Asignar a caso
                </button>
                <button onClick={() => deleteGroup(group.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={15} />
                </button>
                <button onClick={() => toggleExpand(group.id)} className="p-2 text-secondary hover:text-on-background transition-colors">
                  {expandedGroup === group.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              {/* Assign to case panel */}
              {assigningGroup === group.id && (
                <div className="mx-6 mb-4 bg-primary/5 rounded-xl p-4 flex items-center gap-3">
                  <BookOpen size={16} className="text-primary shrink-0" />
                  <select
                    value={selectedCase}
                    onChange={(e) => setSelectedCase(e.target.value ? Number(e.target.value) : '')}
                    className="flex-1 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary bg-white"
                  >
                    <option value="">Selecciona un caso clínico...</option>
                    {cases.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                  <button
                    onClick={() => assignGroupToCase(group.id)}
                    disabled={!selectedCase || assigning}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Send size={12} /> {assigning ? 'Asignando...' : 'Asignar y notificar'}
                  </button>
                  <button onClick={() => setAssigningGroup(null)} className="text-secondary hover:text-on-background transition-colors"><X size={16} /></button>
                </div>
              )}

              {/* Members panel (expandable) */}
              {expandedGroup === group.id && (
                <div className="border-t border-surface-container">
                  {/* Add member by email */}
                  <div className="px-6 py-4 bg-surface-container-low/50 flex items-center gap-3">
                    <Mail size={15} className="text-secondary shrink-0" />
                    <input
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteResult(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && inviteMember(group.id)}
                      placeholder="correo del estudiante..."
                      type="email"
                      className="flex-1 bg-white border border-outline-variant/20 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => inviteMember(group.id)}
                      disabled={inviting || !inviteEmail.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <UserPlus size={13} /> {inviting && invitingFor === group.id ? 'Añadiendo...' : 'Añadir'}
                    </button>
                  </div>

                  {inviteResult && (
                    <div className={cn('mx-6 mb-3 px-4 py-3 rounded-xl text-sm flex items-start gap-2',
                      inviteResult.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    )}>
                      {inviteResult.type === 'ok' ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <X size={15} className="mt-0.5 shrink-0" />}
                      <span>{inviteResult.msg}</span>
                    </div>
                  )}

                  {/* Members list */}
                  {loadingMembers === group.id ? (
                    <div className="px-6 py-6 text-center text-secondary text-sm">Cargando miembros...</div>
                  ) : (members[group.id] ?? []).length === 0 ? (
                    <div className="px-6 py-6 text-center text-secondary text-sm">Sin miembros aún. Añade estudiantes por correo.</div>
                  ) : (
                    <div className="divide-y divide-surface-container">
                      {(members[group.id] ?? []).map((m) => {
                        const name = m.profile?.full_name ?? m.profile?.email ?? `Usuario ${m.user_id.substring(0, 6)}`;
                        const initials = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
                        return (
                          <div key={m.id} className="px-6 py-3 flex items-center gap-4 hover:bg-surface-container-low/50 transition-colors">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase shrink-0">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-on-background truncate">{name}</p>
                              {m.profile?.email && <p className="text-[11px] text-secondary truncate">{m.profile.email}</p>}
                            </div>
                            <span className="text-[10px] text-outline shrink-0">{new Date(m.joined_at).toLocaleDateString('es-MX')}</span>
                            <button onClick={() => removeMember(group.id, m.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

