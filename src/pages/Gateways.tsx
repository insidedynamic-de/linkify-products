/**
 * @file Gateways — SIP gateway/provider management with CRUD
 * @author Viktor Nikolayev <viktor.nikolayev@gmail.com>
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Button, Chip,
  TextField, Switch, FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import FormDialog from '../components/FormDialog';
import CrudTable from '../components/CrudTable';
import Toast from '../components/Toast';
import SearchableSelect from '../components/SearchableSelect';
import type { Gateway, GatewayStatus, PhoneNumberEntry } from '../api/types';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  IconButton, Divider, ToggleButton, ToggleButtonGroup,
  Table, TableBody, TableCell, TableRow,
} from '@mui/material';

const TRANSPORT_OPTIONS = ['udp', 'tcp', 'tls'];
const TYPE_OPTIONS = ['provider', 'pbx', 'ai_platform', 'other'];

function gwChipColor(state: string): 'success' | 'error' | 'warning' {
  if (state === 'REGED' || state === 'online') return 'success';
  if (state === 'FAIL' || state === 'NOREG' || state === 'offline') return 'error';
  return 'warning';
}

export default function Gateways() {
  const { t } = useTranslation();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [gwStatuses, setGwStatuses] = useState<GatewayStatus[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [editGw, setEditGw] = useState<Gateway | null>(null);
  const defaultForm = { name: '', description: '', type: 'provider', host: '', port: 5060, username: '', password: '', register: true, transport: 'udp', auth_username: '', enabled: true, phone_number: '', phone_numbers: [] as PhoneNumberEntry[] };
  const [form, setForm] = useState(defaultForm);
  const [initialForm, setInitialForm] = useState(defaultForm);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [confirmSave, setConfirmSave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; name: string }>({ open: false, name: '' });

  const load = useCallback(async () => {
    try {
      const [gwRes, statusRes] = await Promise.all([
        api.get('/gateways'),
        api.get('/gateways/status'),
      ]);
      setGateways(gwRes.data || []);
      setGwStatuses(statusRes.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  const openAdd = () => {
    setEditGw(null);
    setViewMode(false);
    const fresh = { ...defaultForm };
    setForm(fresh);
    setInitialForm(fresh);
    setDialogOpen(true);
  };

  const toForm = (gw: Gateway) => ({
    ...gw, description: gw.description || '', auth_username: gw.auth_username || '',
    enabled: gw.enabled !== false, phone_number: gw.phone_number || '',
    phone_numbers: gw.phone_numbers || [],
  });

  const openView = (gw: Gateway) => {
    setEditGw(gw);
    setViewMode(true);
    const gwForm = toForm(gw);
    setForm(gwForm);
    setInitialForm(gwForm);
    setDialogOpen(true);
  };

  const openEdit = (gw: Gateway) => {
    setEditGw(gw);
    setViewMode(false);
    const gwForm = toForm(gw);
    setForm(gwForm);
    setInitialForm(gwForm);
    setDialogOpen(true);
  };

  const requestSave = () => setConfirmSave(true);

  const doSave = async () => {
    setConfirmSave(false);
    try {
      if (editGw) await api.put(`/gateways/${editGw.name}`, form);
      else await api.post('/gateways', form);
      setDialogOpen(false);
      setToast({ open: true, message: t('status.success'), severity: 'success' });
      load();
    } catch {
      setToast({ open: true, message: t('status.error'), severity: 'error' });
    }
  };

  const toggleEnabled = async (gw: Gateway) => {
    try {
      await api.put(`/gateways/${gw.name}`, { enabled: !(gw.enabled !== false) });
      load();
    } catch {
      setToast({ open: true, message: t('status.error'), severity: 'error' });
    }
  };

  const requestDelete = (name: string) => setConfirmDelete({ open: true, name });

  const doDelete = async () => {
    const name = confirmDelete.name;
    setConfirmDelete({ open: false, name: '' });
    try {
      await api.delete(`/gateways/${name}`);
      setToast({ open: true, message: t('status.success'), severity: 'success' });
      load();
    } catch {
      setToast({ open: true, message: t('status.error'), severity: 'error' });
    }
  };

  const f = (key: string, val: string | number | boolean) => setForm({ ...form, [key]: val });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">{t('gateway.sip_gateways')}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>{t('gateway.add_gateway')}</Button>
      </Box>

      <CrudTable<Gateway>
        rows={gateways}
        getKey={(gw) => gw.name}
        columns={[
          { id: 'name', header: t('field.name'), render: (gw) => gw.description ? `${gw.name} (${gw.description})` : gw.name, searchText: (gw) => `${gw.name} ${gw.description || ''}` },
          { id: 'type', header: t('field.type'), render: (gw) => <Chip size="small" label={gw.type} />, searchText: (gw) => gw.type },
          { id: 'host', header: t('field.host'), render: (gw) => `${gw.host}:${gw.port}`, searchText: (gw) => `${gw.host}:${gw.port}` },
          { id: 'transport', header: t('field.transport'), field: 'transport' },
        ]}
        columnOrderKey="gateways-columns"
        searchable
        getStatus={(gw) => {
          const st = gwStatuses.find((s) => s.name === gw.name || s.name === `external::${gw.name}` || s.name.endsWith(`::${gw.name}`));
          const label = st?.state || st?.status || '';
          return st
            ? { label: st.registered ? 'REGED' : label, color: gwChipColor(st.registered ? 'REGED' : label) }
            : { label: '\u2014', color: 'default' };
        }}
        getEnabled={(gw) => gw.enabled !== false}
        onToggle={(gw) => toggleEnabled(gw)}
        onView={openView}
        onEdit={openEdit}
        onDelete={(gw) => requestDelete(gw.name)}
      />

      <FormDialog
        open={dialogOpen}
        readOnly={viewMode}
        title={viewMode ? t('modal.view_gateway') : editGw ? t('modal.edit_gateway') : t('modal.add_gateway')}
        dirty={dirty}
        onClose={() => setDialogOpen(false)}
        onSave={requestSave}
      >
        <TextField label={t('field.name')} value={form.description}
          onChange={(e) => {
            const raw = e.target.value;
            const slug = raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._-]/g, '');
            setForm({ ...form, description: raw, name: editGw ? form.name : slug });
          }}
          disabled={viewMode} />
        <TextField label={t('gateway.technical_name')} value={form.name}
          disabled size="small"
          sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13 } }} />
        <SearchableSelect options={TYPE_OPTIONS} value={form.type} onChange={(v) => f('type', v)} label={t('field.type')} disabled={viewMode} />
        <TextField label={t('field.host')} value={form.host} onChange={(e) => f('host', e.target.value)} disabled={viewMode} />
        <TextField label={t('field.port')} type="number" value={form.port} onChange={(e) => f('port', parseInt(e.target.value) || 5060)} disabled={viewMode} />
        <TextField label={t('auth.username')} value={form.username} onChange={(e) => f('username', e.target.value)} disabled={viewMode} />
        <TextField label={t('auth.password')} type="password" value={form.password} onChange={(e) => f('password', e.target.value)} disabled={viewMode} />
        <TextField label={t('gateway.auth_username')} value={form.auth_username} onChange={(e) => f('auth_username', e.target.value)} helperText={t('gateway.auth_username_hint')} disabled={viewMode} />
        {/* Rufnummern */}
        <Divider sx={{ my: 1 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2">{t('gateway.phone_numbers')} ({form.phone_numbers.length})</Typography>
          {!viewMode && (
            <Button size="small" onClick={() => setForm({
              ...form,
              phone_numbers: [...form.phone_numbers, { type: 'single', number: '' }],
            })}>{t('gateway.add_number')}</Button>
          )}
        </Box>
        {form.phone_numbers.map((entry, idx) => (
          <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1, p: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <ToggleButtonGroup
                size="small" exclusive
                value={entry.type}
                onChange={(_, v) => {
                  if (!v) return;
                  const updated = [...form.phone_numbers];
                  updated[idx] = v === 'single'
                    ? { type: 'single', number: entry.number || entry.stem || '' }
                    : { type: 'block', stem: entry.stem || entry.number || '', range_start: '0', range_end: '9' };
                  setForm({ ...form, phone_numbers: updated });
                }}
                disabled={viewMode}
              >
                <ToggleButton value="single">{t('gateway.single_number')}</ToggleButton>
                <ToggleButton value="block">{t('gateway.number_block')}</ToggleButton>
              </ToggleButtonGroup>
              {entry.type === 'single' ? (
                <TextField size="small" label={t('gateway.phone_number')} value={entry.number || ''}
                  placeholder="+4923513682009" disabled={viewMode}
                  onChange={(e) => {
                    const updated = [...form.phone_numbers];
                    updated[idx] = { ...entry, number: e.target.value };
                    setForm({ ...form, phone_numbers: updated });
                  }}
                  error={!!entry.number && !/^\+[1-9]\d{6,14}$/.test(entry.number)}
                />
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField size="small" label={t('gateway.stem_number')} value={entry.stem || ''}
                    placeholder="+492351368200" disabled={viewMode} sx={{ flex: 2 }}
                    onChange={(e) => {
                      const updated = [...form.phone_numbers];
                      updated[idx] = { ...entry, stem: e.target.value };
                      setForm({ ...form, phone_numbers: updated });
                    }}
                  />
                  <TextField size="small" label={t('gateway.range_start')} value={entry.range_start || ''}
                    placeholder="0" disabled={viewMode} sx={{ flex: 1 }}
                    onChange={(e) => {
                      const updated = [...form.phone_numbers];
                      updated[idx] = { ...entry, range_start: e.target.value };
                      setForm({ ...form, phone_numbers: updated });
                    }}
                  />
                  <TextField size="small" label={t('gateway.range_end')} value={entry.range_end || ''}
                    placeholder="9" disabled={viewMode} sx={{ flex: 1 }}
                    onChange={(e) => {
                      const updated = [...form.phone_numbers];
                      updated[idx] = { ...entry, range_end: e.target.value };
                      setForm({ ...form, phone_numbers: updated });
                    }}
                  />
                </Box>
              )}
            </Box>
            {!viewMode && (
              <IconButton size="small" color="error" onClick={() => {
                const updated = form.phone_numbers.filter((_, i) => i !== idx);
                setForm({ ...form, phone_numbers: updated });
              }}><DeleteIcon fontSize="small" /></IconButton>
            )}
          </Box>
        ))}
        {form.phone_numbers.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{t('gateway.no_numbers')}</Typography>
        )}
        <SearchableSelect options={TRANSPORT_OPTIONS} value={form.transport} onChange={(v) => f('transport', v)} label={t('field.transport')} disabled={viewMode} />
        <FormControlLabel
          control={<Switch checked={form.enabled} onChange={(e) => f('enabled', e.target.checked)} color="success" disabled={viewMode} />}
          label={form.enabled ? t('status.enabled') : t('status.disabled')}
        />
      </FormDialog>

      <ConfirmDialog open={confirmSave} variant="save"
        title={t('confirm.save_title')} message={t('confirm.save_message')}
        confirmLabel={t('button.save')} cancelLabel={t('button.cancel')}
        onConfirm={doSave} onCancel={() => setConfirmSave(false)} />

      <ConfirmDialog open={confirmDelete.open} variant="delete"
        title={t('confirm.delete_title')}
        message={t('confirm.delete_message', { name: confirmDelete.name })}
        confirmLabel={t('button.delete')} cancelLabel={t('button.cancel')}
        onConfirm={doDelete} onCancel={() => setConfirmDelete({ open: false, name: '' })} />

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} />
    </Box>
  );
}
