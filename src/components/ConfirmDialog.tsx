/**
 * @file ConfirmDialog — Reusable confirmation dialog for save and delete actions
 * @author Viktor Nikolayev <viktor.nikolayev@gmail.com>
 */
import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, CircularProgress, TextField,
} from '@mui/material';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'delete' | 'save';
  /** While true: spinner on the confirm button, both buttons disabled, no re-click. */
  loading?: boolean;
  /** When true: render a mandatory reason field; confirm stays disabled until it is filled. */
  requireReason?: boolean;
  reasonLabel?: string;
  /** Receives the trimmed reason when requireReason is set, otherwise undefined. */
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'delete',
  loading = false,
  requireReason = false,
  reasonLabel = 'Reason',
  onConfirm, onCancel,
}: Props) {
  const [reason, setReason] = useState('');

  // Reset the reason each time the dialog (re)opens.
  useEffect(() => { if (open) setReason(''); }, [open]);

  const reasonMissing = requireReason && reason.trim().length === 0;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onCancel}
      disableRestoreFocus
      fullWidth={requireReason}
      maxWidth={requireReason ? 'xs' : undefined}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
        {requireReason && (
          <TextField
            autoFocus
            fullWidth
            size="small"
            multiline
            minRows={2}
            label={reasonLabel}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            sx={{ mt: 2 }}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button
          onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
          variant="contained"
          color={variant === 'delete' ? 'error' : 'success'}
          disabled={loading || reasonMissing}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
