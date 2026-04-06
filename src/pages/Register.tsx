/**
 * @file Register — Company registration form
 * @author Viktor Nikolayev <viktor.nikolayev@gmail.com>
 */
import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Card, CardContent, TextField, Button, Typography, Alert,
  Link, Grid2 as Grid, Stepper, Step, StepLabel,
} from '@mui/material';
import api from '../api/client';
import Toast from '../components/Toast';

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{12,}$/;

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  // Step 0: Company data
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('DE');
  const [vatId, setVatId] = useState('');
  const [website, setWebsite] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');

  // Step 1: Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  const steps = [t('auth.company_name'), t('auth.email') + ' & ' + t('auth.password')];

  const validateStep0 = (): boolean => {
    if (!companyName.trim()) { setError(t('validation.required') + ': ' + t('auth.company_name')); return false; }
    return true;
  };

  const validateStep1 = (): boolean => {
    if (!email.trim()) { setError(t('validation.required') + ': ' + t('auth.email')); return false; }
    if (!password) { setError(t('validation.required') + ': ' + t('auth.password')); return false; }
    if (!PASSWORD_REGEX.test(password)) { setError(t('auth.password_weak')); return false; }
    if (password !== passwordConfirm) { setError(t('auth.password_mismatch')); return false; }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (activeStep === 0 && validateStep0()) {
      setActiveStep(1);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!validateStep1()) return;

    setLoading(true);
    try {
      await api.post('/auth/register', {
        email,
        password,
        company_name: companyName,
        contact_person: contactPerson,
        phone,
        address,
        zip,
        city,
        country,
        vat_id: vatId,
        website,
        invoice_email: invoiceEmail || email,
        captcha_token: '', // Turnstile later
      });

      setToast({ open: true, message: t('auth.register_success'), severity: 'success' });
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = axiosErr?.response?.status;
      const detail = axiosErr?.response?.data?.detail;

      if (status === 409) setError(t('auth.email_taken'));
      else if (status === 422) setError(detail || t('auth.password_weak'));
      else setError(detail || t('status.error'));
    }
    setLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Card sx={{ width: 520, p: 2 }}>
        <CardContent sx={{ px: 4, py: 3 }}>
          <Typography variant="h5" sx={{ mb: 2, textAlign: 'center' }}>
            {t('auth.register_title')}
          </Typography>

          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}><StepLabel>{label}</StepLabel></Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Step 0: Company data */}
          {activeStep === 0 && (
            <>
              <TextField
                fullWidth label={t('auth.company_name')} required
                value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                sx={{ mb: 2 }} size="small" autoFocus
              />
              <TextField
                fullWidth label={t('auth.contact_person')}
                value={contactPerson} onChange={(e) => setContactPerson(e.target.value)}
                sx={{ mb: 2 }} size="small"
              />
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                  <TextField fullWidth label={t('auth.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} size="small" />
                </Grid>
                <Grid size={6}>
                  <TextField fullWidth label={t('auth.website')} value={website} onChange={(e) => setWebsite(e.target.value)} size="small" />
                </Grid>
              </Grid>
              <TextField
                fullWidth label={t('auth.address')}
                value={address} onChange={(e) => setAddress(e.target.value)}
                sx={{ mb: 2 }} size="small"
              />
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={3}>
                  <TextField fullWidth label={t('auth.zip')} value={zip} onChange={(e) => setZip(e.target.value)} size="small" />
                </Grid>
                <Grid size={5}>
                  <TextField fullWidth label={t('auth.city')} value={city} onChange={(e) => setCity(e.target.value)} size="small" />
                </Grid>
                <Grid size={4}>
                  <TextField fullWidth label={t('auth.country')} value={country} onChange={(e) => setCountry(e.target.value)} size="small" />
                </Grid>
              </Grid>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid size={6}>
                  <TextField fullWidth label={t('auth.vat_id')} value={vatId} onChange={(e) => setVatId(e.target.value)} size="small" />
                </Grid>
                <Grid size={6}>
                  <TextField fullWidth label={t('auth.invoice_email')} value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)} size="small" placeholder={email || 'rechnung@firma.de'} />
                </Grid>
              </Grid>
              <Button variant="contained" fullWidth onClick={handleNext}>
                {t('button.save') + ' & ' + t('auth.register')}
              </Button>
            </>
          )}

          {/* Step 1: Credentials */}
          {activeStep === 1 && (
            <>
              <TextField
                fullWidth label={t('auth.email')} type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                sx={{ mb: 2 }} size="small" autoFocus
              />
              <TextField
                fullWidth label={t('auth.password')} type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 2 }} size="small"
                helperText={t('auth.password_weak')}
              />
              <TextField
                fullWidth label={t('auth.password_confirm')} type="password" required
                value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                sx={{ mb: 2 }} size="small"
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button variant="outlined" onClick={() => { setActiveStep(0); setError(''); }} sx={{ flex: 1 }}>
                  {t('button.cancel')}
                </Button>
                <Button variant="contained" onClick={handleRegister} disabled={loading} sx={{ flex: 2 }}>
                  {t('auth.register')}
                </Button>
              </Box>
            </>
          )}

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {t('auth.has_account')}{' '}
              <Link component={RouterLink} to="/login">{t('auth.login')}</Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Toast open={toast.open} message={toast.message} severity={toast.severity} onClose={() => setToast({ ...toast, open: false })} />
    </Box>
  );
}
