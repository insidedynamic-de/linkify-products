/**
 * @file UpdateDrawer — Right-anchor drawer for triggering and monitoring updates
 */
import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Drawer, Box, Typography, TextField, Button, Alert, Chip,
  CircularProgress, IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';
import { updatesApi, type DeploymentPoll } from '../api/updates';
import { useVersionPoll } from '../context/VersionPollContext';

interface UpdateDrawerProps {
  open: boolean;
  onClose: () => void;
  instanceId: number;
  instanceName: string;
}

export default function UpdateDrawer({
  open, onClose, instanceId, instanceName,
}: UpdateDrawerProps) {
  const { t } = useTranslation();
  const { statuses, refresh: refreshPoll } = useVersionPoll();
  const vs = statuses[instanceId];

  const [reason, setReason] = useState('');
  const [triggering, setTriggering] = useState(false);
  const [triggerError, setTriggerError] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<number | null>(vs?.deployment_id ?? null);
  const [deployment, setDeployment] = useState<DeploymentPoll | null>(null);
  const [pollActive, setPollActive] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-initialize if update already in progress
  useEffect(() => {
    if (vs?.deployment_status === 'updating' && vs.deployment_id) {
      setDeploymentId(vs.deployment_id);
      setPollActive(true);
    }
  }, [vs?.deployment_status, vs?.deployment_id]);

  // Deployment status poll (3s while updating)
  useEffect(() => {
    if (!pollActive || !deploymentId) return;
    const id = setInterval(async () => {
      try {
        const r = await updatesApi.pollDeployment(instanceId, deploymentId);
        setDeployment(r.data);
        if (r.data.status !== 'updating') {
          setPollActive(false);
          refreshPoll();
        }
      } catch {
        // ignore
      }
    }, 3_000);
    return () => clearInterval(id);
  }, [pollActive, deploymentId, instanceId, refreshPoll]);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [deployment?.events]);

  const handleUpdate = async () => {
    if (reason.trim().length < 10) return;
    if (!vs?.latest_version) return;
    setTriggering(true);
    setTriggerError(null);
    try {
      const r = await updatesApi.triggerUpdate(instanceId, reason.trim(), vs.latest_version);
      setDeploymentId(r.data.deployment_id);
      setPollActive(true);
      // Fetch initial deployment state immediately
      const dep = await updatesApi.pollDeployment(instanceId, r.data.deployment_id);
      setDeployment(dep.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? t('updates.error_trigger');
      setTriggerError(msg);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, p: 3 } }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SystemUpdateIcon sx={{ mr: 1 }} />
        <Typography variant="h6">{t('updates.drawer_title')}</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      {/* Instance name + version row */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {instanceName}
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">{t('updates.current_version')}</Typography>
          <Typography variant="body1" fontWeight={600}>{vs?.current_version || '—'}</Typography>
        </Box>
        <Box sx={{ alignSelf: 'center' }}>→</Box>
        <Box>
          <Typography variant="caption" color="text.secondary">{t('updates.latest_version')}</Typography>
          <Typography variant="body1" fontWeight={600} color="success.main">
            {vs?.latest_version || '—'}
          </Typography>
        </Box>
      </Box>

      {/* Changelog */}
      {vs?.changelog && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('updates.changelog')}</Typography>
          <Box sx={{
            bgcolor: 'action.hover', borderRadius: 1, p: 1.5, maxHeight: 160,
            overflowY: 'auto', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
          }}>
            {vs.changelog}
          </Box>
        </Box>
      )}

      {/* Reason field — only shown when no update in flight */}
      {!pollActive && deployment?.status !== 'updating' && (
        <TextField
          fullWidth
          label={t('updates.reason_label')}
          placeholder={t('updates.reason_placeholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          helperText={t('updates.reason_hint')}
          error={reason.length > 0 && reason.trim().length < 10}
          multiline
          rows={2}
          sx={{ mb: 2 }}
          disabled={triggering}
        />
      )}

      {/* Trigger error */}
      {triggerError && (
        <Alert severity="error" sx={{ mb: 2 }}>{triggerError}</Alert>
      )}

      {/* Update button */}
      {!pollActive && deployment?.status !== 'updating' && (
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={
            triggering ||
            reason.trim().length < 10 ||
            !vs?.update_available
          }
          onClick={handleUpdate}
          startIcon={triggering ? <CircularProgress size={16} /> : <SystemUpdateIcon />}
          sx={{ mb: 3 }}
        >
          {triggering ? t('updates.button_updating') : t('updates.button_update')}
        </Button>
      )}

      {/* Aktualisierungsstatus section */}
      {(pollActive || deployment) && (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t('updates.status_title')}
          </Typography>

          {/* Status chip */}
          <Box sx={{ mb: 1 }}>
            <Chip
              label={deployment
                ? t(`updates.status_${deployment.status}`)
                : t('updates.status_updating')}
              color={
                !deployment || deployment.status === 'updating' ? 'info'
                  : deployment.status === 'ok'
                    ? 'success'
                    : 'error'
              }
              size="small"
              icon={pollActive ? <CircularProgress size={12} /> : undefined}
            />
          </Box>

          {/* Scrollable event log */}
          <Box
            ref={logRef}
            sx={{
              bgcolor: 'action.hover',
              borderRadius: 1,
              p: 1.5,
              height: 220,
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {(deployment?.events ?? []).map((ev, i) => (
              <Box
                key={i}
                sx={{
                  color:
                    ev.level === 'error' ? 'error.main'
                      : ev.level === 'warn' ? 'warning.main'
                        : 'text.secondary',
                  mb: 0.25,
                }}
              >
                <span style={{ opacity: 0.5 }}>
                  {new Date(ev.ts).toLocaleTimeString()}
                </span>
                {' '}
                {ev.msg}
              </Box>
            ))}
            {(!deployment?.events?.length) && (
              <Typography variant="caption" color="text.secondary">
                {t('updates.log_waiting')}
              </Typography>
            )}
          </Box>

          {/* Done confirmation */}
          {deployment?.status === 'ok' && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {t('updates.success_message', { version: deployment.target_version })}
            </Alert>
          )}
          {deployment?.status === 'error' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t('updates.error_message')}
            </Alert>
          )}
        </>
      )}

      {/* No update available state */}
      {!vs?.update_available && !deployment && (
        <Alert severity="success">{t('updates.up_to_date')}</Alert>
      )}
    </Drawer>
  );
}
