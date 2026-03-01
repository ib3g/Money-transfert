import { useState } from 'react';
import {
  UsersIcon, PlusIcon, PencilSimpleIcon, TrashIcon, UserCircleIcon,
  ShieldCheckIcon, XIcon, EyeIcon, EyeSlashIcon, GlobeIcon
} from '@phosphor-icons/react';
import { useUsers, useCreateUser, useDeleteUser, useUpdatePermissions, useAssignZones } from '@/hooks/useUsers';
import { useZones } from '@/hooks/useZones';
import { usePermissions } from '@/hooks/usePermissions';
import { BlankSlate } from '@/components/ui/BlankSlate';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { SkeletonTable } from '@/components/ui/Skeleton';
import type { User, Permission } from '@/types';

const ROLE_LABELS: Record<string, string> = { OWNER: 'Owner', MANAGER: 'Manager', AGENT: 'Agent' };
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-brand-light text-brand',
  AGENT: 'bg-slate-100 text-slate-600',
};

const ALL_PERMISSIONS: { value: Permission; label: string; desc: string }[] = [
  { value: 'MANAGE_USERS', label: 'Gérer les utilisateurs', desc: 'Créer/modifier/supprimer les agents et managers' },
  { value: 'MANAGE_ZONES', label: 'Gérer les zones', desc: 'Créer/modifier les zones (pays)' },
  { value: 'MANAGE_RATES', label: 'Gérer les taux', desc: 'Définir/modifier les taux de change' },
  { value: 'VIEW_ALL_TRANSACTIONS', label: 'Voir toutes les transactions', desc: 'Accès à toutes les transactions' },
  { value: 'CANCEL_TRANSACTIONS', label: 'Annuler les transactions', desc: "Annuler des transactions d'autres agents" },
  { value: 'VIEW_AUDIT_LOGS', label: 'Voir les audits', desc: "Accéder aux logs d'audit" },
  { value: 'GENERATE_REPORTS', label: 'Générer des rapports', desc: 'Télécharger les rapports PDF' },
  { value: 'FULL_ADMIN', label: 'Admin complet', desc: 'Tous les droits (sauf modifier le owner)' },
];

export default function Users() {
  const { isOwner, can } = usePermissions();
  const { data: users, isLoading } = useUsers();
  const { data: zones } = useZones();
  const removeUser = useDeleteUser();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  if (!can('MANAGE_USERS')) {
    return <BlankSlate icon={<ShieldCheckIcon size={32} weight="duotone" />} title="Accès refusé" description="Vous n'avez pas la permission de gérer les utilisateurs." />;
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy">Utilisateurs</h1>
        <Button icon={<PlusIcon size={16} weight="bold" />} onClick={() => setShowCreate(true)}>
          Ajouter
        </Button>
      </div>

      {isLoading ? (
        <SkeletonTable rows={5} />
      ) : !users || users.length === 0 ? (
        <BlankSlate
          icon={<UsersIcon size={32} weight="duotone" />}
          title="Aucun utilisateur"
          description="Ajoutez votre premier agent ou manager pour commencer."
          action={{ label: 'Ajouter un utilisateur', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
          {/* Mobile: Cards */}
          <div className="lg:hidden divide-y divide-slate-100">
            {users.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                isOwner={isOwner}
                onPermissions={() => { setSelectedUser(user); setShowPermissions(true); }}
                onZones={() => { setSelectedUser(user); setShowZones(true); }}
                onDelete={() => setUserToDelete(user)}
              />
            ))}
          </div>

          {/* Desktop: Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface border-b border-slate-100">
                <tr>
                  {['Utilisateur', 'Rôle', 'Zones', 'Statut', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wide px-5 py-3.5">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-light rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-brand">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-navy">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.zones?.slice(0, 2).map((uz) => (
                          <span key={uz.id} className="text-xs bg-surface px-2 py-0.5 rounded-lg text-muted border border-slate-100">
                            {uz.zone.name}
                          </span>
                        ))}
                        {(user.zones?.length ?? 0) > 2 && (
                          <span className="text-xs text-muted">+{(user.zones?.length ?? 0) - 2}</span>
                        )}
                        {(user.zones?.length ?? 0) === 0 && <span className="text-xs text-muted-light">Aucune</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${user.isActive ? 'bg-success-bg text-success' : 'bg-slate-100 text-slate-500'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-success-light' : 'bg-slate-400'}`} />
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedUser(user); setShowZones(true); }}
                          className="p-1.5 text-muted-light hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                          aria-label="Gérer les zones"
                          title="Zones"
                        >
                          <GlobeIcon size={15} />
                        </button>
                        {isOwner && user.role === 'MANAGER' && (
                          <button
                            onClick={() => { setSelectedUser(user); setShowPermissions(true); }}
                            className="p-1.5 text-muted-light hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                            aria-label="Permissions"
                            title="Permissions"
                          >
                            <ShieldCheckIcon size={15} />
                          </button>
                        )}
                        {user.role !== 'OWNER' && user.isActive && (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-1.5 text-muted-light hover:text-danger hover:bg-danger-bg rounded-lg transition-colors"
                            aria-label="Supprimer"
                            title="Supprimer"
                          >
                            <TrashIcon size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreate && (
        <CreateUserModal
          zones={zones ?? []}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Permissions Modal */}
      {showPermissions && selectedUser && isOwner && (
        <PermissionsModal
          user={selectedUser}
          onClose={() => { setShowPermissions(false); setSelectedUser(null); }}
        />
      )}

      {/* Zones Modal */}
      {showZones && selectedUser && (
        <ZonesModal
          user={selectedUser}
          allZones={zones ?? []}
          onClose={() => { setShowZones(false); setSelectedUser(null); }}
        />
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          onClose={() => setUserToDelete(null)}
          onConfirm={(id) => {
            removeUser.mutate(id);
            setUserToDelete(null);
          }}
          isLoading={removeUser.isPending}
        />
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function UserCard({ user, isOwner, onPermissions, onZones, onDelete }: {
  user: User; isOwner: boolean;
  onPermissions: () => void; onZones: () => void; onDelete: () => void;
}) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-brand">{user.firstName[0]}{user.lastName[0]}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-muted">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${user.isActive ? 'bg-success-bg text-success' : 'bg-slate-100 text-slate-500'
                }`}>
                {user.isActive ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onZones} className="p-2 text-muted-light hover:text-brand rounded-lg" aria-label="Zones">
            <GlobeIcon size={16} />
          </button>
          {isOwner && user.role === 'MANAGER' && (
            <button onClick={onPermissions} className="p-2 text-muted-light hover:text-brand rounded-lg" aria-label="Permissions">
              <ShieldCheckIcon size={16} />
            </button>
          )}
          {user.role !== 'OWNER' && user.isActive && (
            <button onClick={onDelete} className="p-2 text-muted-light hover:text-danger rounded-lg" aria-label="Supprimer">
              <TrashIcon size={16} />
            </button>
          )}
        </div>
      </div>
      {(user.zones?.length ?? 0) > 0 && (
        <div className="flex flex-wrap gap-1 mt-3 pl-13">
          {user.zones?.map((uz) => (
            <span key={uz.id} className="text-xs bg-surface px-2 py-0.5 rounded-lg text-muted border border-slate-100">
              {uz.zone.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateUserModal({ zones, onClose }: { zones: any[]; onClose: () => void }) {
  const createUser = useCreateUser();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    role: 'AGENT' as 'AGENT' | 'MANAGER',
    zoneIds: [] as string[],
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const toggleZone = (id: string) =>
    setForm((f) => ({
      ...f,
      zoneIds: f.zoneIds.includes(id) ? f.zoneIds.filter((z) => z !== id) : [...f.zoneIds, id],
    }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Requis';
    if (!form.lastName.trim()) errs.lastName = 'Requis';
    if (!form.email.trim()) errs.email = 'Requis';
    if (form.password.length < 8) errs.password = 'Minimum 8 caractères';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      await createUser.mutateAsync(form);
      onClose();
    } catch { /* handled by hook */ }
  };

  return (
    <Modal title="Nouvel utilisateur" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" value={form.firstName} onChange={set('firstName')} error={errors.firstName} required />
          <Input label="Nom" value={form.lastName} onChange={set('lastName')} error={errors.lastName} required />
        </div>
        <Input label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} required />
        <Input
          label="Mot de passe"
          type={showPw ? 'text' : 'password'}
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          rightElement={
            <button type="button" onClick={() => setShowPw(!showPw)} className="text-muted-light">
              {showPw ? <EyeSlashIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          }
          required
        />
        <div>
          <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">Rôle</label>
          <select
            value={form.role}
            onChange={set('role') as any}
            className="w-full border border-muted-light/50 bg-white rounded-xl px-4 py-3 text-sm text-navy focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none"
          >
            <option value="AGENT">Agent</option>
            <option value="MANAGER">Manager</option>
          </select>
        </div>
        {zones.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-2">Zones assignées</label>
            <div className="flex flex-wrap gap-2">
              {zones.map((z: any) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => toggleZone(z.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.zoneIds.includes(z.id)
                    ? 'bg-brand-light border-brand text-brand'
                    : 'bg-white border-slate-200 text-muted hover:border-brand/30'
                    }`}
                >
                  {z.name} ({z.currency})
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Annuler</Button>
          <Button type="submit" loading={createUser.isPending} className="flex-1">Créer</Button>
        </div>
      </form>
    </Modal>
  );
}

function PermissionsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const updatePerms = useUpdatePermissions();
  const [perms, setPerms] = useState<Permission[]>(user.permissions);

  const toggle = (p: Permission) => {
    if (p === 'FULL_ADMIN') {
      setPerms((prev) => prev.includes('FULL_ADMIN') ? [] : ['FULL_ADMIN']);
      return;
    }
    setPerms((prev) =>
      prev.includes(p)
        ? prev.filter((x) => x !== p && x !== 'FULL_ADMIN')
        : [...prev.filter((x) => x !== 'FULL_ADMIN'), p]
    );
  };

  const handleSave = async () => {
    await updatePerms.mutateAsync({ id: user.id, permissions: perms });
    onClose();
  };

  return (
    <Modal title={`Permissions — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <div className="space-y-2 mb-5">
        {ALL_PERMISSIONS.map((p) => (
          <label
            key={p.value}
            className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${perms.includes(p.value)
              ? 'bg-brand-light border-brand/30'
              : 'bg-surface border-transparent hover:bg-surface-alt'
              }`}
          >
            <input
              type="checkbox"
              checked={perms.includes(p.value)}
              onChange={() => toggle(p.value)}
              className="mt-0.5 accent-brand w-4 h-4"
            />
            <div>
              <p className="text-sm font-semibold text-navy">{p.label}</p>
              <p className="text-xs text-muted">{p.desc}</p>
            </div>
          </label>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">Annuler</Button>
        <Button onClick={handleSave} loading={updatePerms.isPending} className="flex-1">Enregistrer</Button>
      </div>
    </Modal>
  );
}

function ZonesModal({ user, allZones, onClose }: { user: User; allZones: any[]; onClose: () => void }) {
  const assignZones = useAssignZones();
  const currentZoneIds = user.zones?.map((uz) => uz.zoneId) ?? [];
  const [selected, setSelected] = useState<string[]>(currentZoneIds);

  const toggle = (id: string) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]);

  const handleSave = async () => {
    await assignZones.mutateAsync({ id: user.id, zoneIds: selected });
    onClose();
  };

  return (
    <Modal title={`Zones — ${user.firstName} ${user.lastName}`} onClose={onClose}>
      <div className="space-y-2 mb-5">
        {allZones.map((z: any) => (
          <label
            key={z.id}
            className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${selected.includes(z.id)
              ? 'bg-brand-light border-brand/30'
              : 'bg-surface border-transparent hover:bg-surface-alt'
              }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(z.id)}
              onChange={() => toggle(z.id)}
              className="accent-brand w-4 h-4"
            />
            <div>
              <p className="text-sm font-semibold text-navy">{z.name}</p>
              <p className="text-xs text-muted">{z.currency}</p>
            </div>
          </label>
        ))}
        {allZones.length === 0 && (
          <p className="text-sm text-muted text-center py-4">Aucune zone disponible. Créez d'abord des zones.</p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" onClick={onClose} className="flex-1">Annuler</Button>
        <Button onClick={handleSave} loading={assignZones.isPending} className="flex-1">Enregistrer</Button>
      </div>
    </Modal>
  );
}

// Reusable Modal shell
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="bg-white rounded-2xl shadow-card-lg w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-bold text-navy">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-light hover:text-navy rounded-lg transition-colors" aria-label="Fermer">
            <XIcon size={18} weight="bold" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function DeleteUserModal({ user, onClose, onConfirm, isLoading }: {
  user: User;
  onClose: () => void;
  onConfirm: (id: string) => void;
  isLoading: boolean;
}) {
  return (
    <Modal title="Supprimer l'utilisateur" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-danger/5 rounded-xl border border-danger/20">
          <ShieldCheckIcon size={20} weight="fill" className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">
            Êtes-vous sûr de vouloir supprimer <strong className="text-navy">{user.firstName} {user.lastName}</strong> ?
            Cet utilisateur sera désactivé et n'apparaîtra plus dans cette liste, mais son historique de transactions sera conservé.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose} disabled={isLoading}>
            Annuler
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            loading={isLoading}
            onClick={() => onConfirm(user.id)}
          >
            Supprimer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
