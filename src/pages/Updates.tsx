/**
 * @file Updates — List all instances with update status and open drawer
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Typography, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Chip, Button, CircularProgress,
} from '@mui/material';
import SystemUpdateIcon from '@mui/icons-material/SystemUpdate';
import api from '../api/client';
import { useVersionPoll } from '../context/VersionPollContext';
import UpdateDrawer from '../components/UpdateDrawer';

interface InstanceRow {
  id: number;
  name: string;
  product: string;
  status: string;
}

export default function Updates() {
  const { t } = useTranslation();
  const { statuses } = useVersionPoll();
  const [instances, setInstances] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerInstanceId, setDrawerInstanceId] = useState<number | null>(null);
  const [drawerInstanceName, setDrawerInstanceName] = useState('');

  useEffect(() => {
    api.get('/my-instances')
      .then((r) => {
        const rows: InstanceRow[] = (r.data || []).map(
          (i: { id: number; name: string; product: string; status: string }) => ({
            id: i.id, name: i.name, product: i.product, status: i.status,
          })
        );
        setInstances(rows);
        // Auto-open drawer if exactly one updatable instance
        const updatable = rows.filter((row) => statuses[row.id]?.update_available);
        if (updatable.length === 1) {
          setDrawerInstanceId(updatable[0].id);
          setDrawerInstanceName(updatable[0].name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 1 }}>
        <SystemUpdateIcon />
        <Typography variant="h5">{t('updates.page_title')}</Typography>
      </Box>

      {loading && <CircularProgress />}

      {!loading && (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('field.name')}</TableCell>
                <TableCell>{t('field.type')}</TableCell>
                <TableCell>{t('updates.col_current')}</TableCell>
                <TableCell>{t('updates.col_latest')}</TableCell>
                <TableCell>{t('field.status')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {instances.map((inst) => {
                const vs = statuses[inst.id];
                return (
                  <TableRow key={inst.id}>
                    <TableCell>{inst.name}</TableCell>
                    <TableCell>{inst.product}</TableCell>
                    <TableCell>{vs?.current_version || '—'}</TableCell>
                    <TableCell>{vs?.latest_version || '—'}</TableCell>
                    <TableCell>
                      {vs?.update_available
                        ? <Chip label={t('updates.chip_available')} color="warning" size="small" />
                        : vs?.current_version
                          ? <Chip label={t('updates.chip_uptodate')} color="success" size="small" />
                          : <Chip label="—" size="small" />
                      }
                    </TableCell>
                    <TableCell>
                      {vs?.update_available && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<SystemUpdateIcon />}
                          onClick={() => {
                            setDrawerInstanceId(inst.id);
                            setDrawerInstanceName(inst.name);
                          }}
                        >
                          {t('updates.button_open')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {drawerInstanceId !== null && (
        <UpdateDrawer
          open={drawerInstanceId !== null}
          onClose={() => setDrawerInstanceId(null)}
          instanceId={drawerInstanceId}
          instanceName={drawerInstanceName}
        />
      )}
    </Box>
  );
}
