const path = require('path');
const fs = require('fs');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pool, initDb } = require('./db');
const publicRoutes = require('./routes/public');
const adminRoutes = require('./routes/admin');
const { UPLOAD_DIR } = require('./services/uploads');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'views'));
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(process.cwd(), 'public'), { maxAge: isProd ? '1d' : 0 }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: isProd ? '7d' : 0 }));

app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'dev-only-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: isProd, maxAge: 1000 * 60 * 60 * 12 }
}));

app.use('/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: true, legacyHeaders: false }));
app.use((req, res, next) => {
  res.locals.formatBRL = value => value == null || value === '' ? 'Sob consulta' : Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  res.locals.year = new Date().getFullYear();
  next();
});

app.get('/health', (_req, res) => res.status(200).json({ ok: true }));
app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

app.use((req, res) => res.status(404).render('404', { title: 'Página não encontrada' }));
app.use((err, req, res, _next) => {
  console.error(err);
  const message = isProd ? 'Ocorreu um erro. Tente novamente.' : err.message;
  if (req.path.startsWith('/admin')) return res.status(500).send(`<h1>Erro</h1><p>${message}</p><p><a href="/admin">Voltar ao painel</a></p>`);
  res.status(500).render('500', { title: 'Erro', message });
});

initDb()
  .then(() => app.listen(PORT, '0.0.0.0', () => console.log(`ImpriMarte rodando na porta ${PORT}`)))
  .catch(err => { console.error('Falha ao inicializar banco:', err); process.exit(1); });
