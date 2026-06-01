/**
 * @file ConfirmDialog — Reusable confirmation dialog for save and delete actions
 * @author Viktor Nikolayev <viktor.nikolayev@gmail.com>
 */
import {
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Button, CircularProgress,
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
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'delete',
  loading = false,
  onConfirm, onCancel,
}: Props) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onCancel} disableRestoreFocus>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color={variant === 'delete' ? 'error' : 'success'}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
