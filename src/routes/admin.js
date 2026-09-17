const express = require('express');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { query, getSettings } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../services/uploads');
const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  res.render('admin/login', { title: 'Entrar no painel', error: null, layout: false });
});

router.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const result = await query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rowCount || !(await bcrypt.compare(req.body.password || '', result.rows[0].password_hash))) {
      return res.status(401).render('admin/login', { title: 'Entrar no painel', error: 'E-mail ou senha inválidos.', layout: false });
    }
    req.session.userId = result.rows[0].id;
    req.session.userName = result.rows[0].name;
    const target = req.session.returnTo || '/admin';
    delete req.session.returnTo;
    res.redirect(target);
  } catch (err) { next(err); }
});

router.post('/logout', requireAdmin, (req, res) => req.session.destroy(() => res.redirect('/admin/login')));

router.use(requireAdmin);
router.use(async (req, res, next) => { res.locals.adminName = req.session.userName || 'Administrador'; next(); });

router.get('/', async (req, res, next) => {
  try {
    const [products, categories, featured] = await Promise.all([
      query('SELECT COUNT(*)::int AS count FROM products'),
      query('SELECT COUNT(*)::int AS count FROM categories'),
      query('SELECT COUNT(*)::int AS count FROM products WHERE featured=TRUE AND active=TRUE')
    ]);
    res.render('admin/dashboard', { title: 'Painel', stats: { products: products.rows[0].count, categories: categories.rows[0].count, featured: featured.rows[0].count } });
  } catch (err) { next(err); }
});

router.get('/produtos', async (req, res, next) => {
  try {
    const result = await query(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ORDER BY p.sort_order,p.name`);
    res.render('admin/products', { title: 'Produtos', products: result.rows });
  } catch (err) { next(err); }
});

router.get('/produtos/novo', async (req, res, next) => {
  try {
    const cats = await query('SELECT * FROM categories ORDER BY sort_order,name');
    res.render('admin/product-form', { title: 'Novo produto', product: null, categories: cats.rows, error: null });
  } catch (err) { next(err); }
});

router.post('/produtos/novo', upload.single('image'), async (req, res, next) => {
  try {
    const slug = slugify(req.body.slug || req.body.name, { lower: true, strict: true });
    await query(`INSERT INTO products(category_id,name,slug,short_description,description,price_from,image_path,featured,active,sort_order)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [
      req.body.category_id || null, req.body.name, slug, req.body.short_description || '', req.body.description || '', req.body.price_from || null,
      req.file ? `/uploads/${req.file.filename}` : null, !!req.body.featured, !!req.body.active, parseInt(req.body.sort_order || '0',10)
    ]);
    res.redirect('/admin/produtos');
  } catch (err) { next(err); }
});

router.get('/produtos/:id/editar', async (req, res, next) => {
  try {
    const [p, cats] = await Promise.all([query('SELECT * FROM products WHERE id=$1',[req.params.id]), query('SELECT * FROM categories ORDER BY sort_order,name')]);
    if (!p.rowCount) return res.redirect('/admin/produtos');
    res.render('admin/product-form', { title: 'Editar produto', product: p.rows[0], categories: cats.rows, error: null });
  } catch (err) { next(err); }
});

router.post('/produtos/:id/editar', upload.single('image'), async (req, res, next) => {
  try {
    const current = await query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!current.rowCount) return res.redirect('/admin/produtos');
    const slug = slugify(req.body.slug || req.body.name, { lower: true, strict: true });
    const imagePath = req.file ? `/uploads/${req.file.filename}` : current.rows[0].image_path;
    await query(`UPDATE products SET category_id=$1,name=$2,slug=$3,short_description=$4,description=$5,price_from=$6,image_path=$7,
      featured=$8,active=$9,sort_order=$10,updated_at=NOW() WHERE id=$11`, [
      req.body.category_id || null, req.body.name, slug, req.body.short_description || '', req.body.description || '', req.body.price_from || null,
      imagePath, !!req.body.featured, !!req.body.active, parseInt(req.body.sort_order || '0',10), req.params.id
    ]);
    res.redirect('/admin/produtos');
  } catch (err) { next(err); }
});

router.post('/produtos/:id/excluir', async (req, res, next) => {
  try { await query('DELETE FROM products WHERE id=$1',[req.params.id]); res.redirect('/admin/produtos'); } catch (err) { next(err); }
});

router.get('/categorias', async (req, res, next) => {
  try { const r=await query('SELECT * FROM categories ORDER BY sort_order,name'); res.render('admin/categories',{title:'Categorias',categories:r.rows}); } catch(err){next(err)}
});
router.post('/categorias', async (req,res,next)=>{
  try {
    const slug=slugify(req.body.slug||req.body.name,{lower:true,strict:true});
    await query('INSERT INTO categories(name,slug,icon,sort_order,active) VALUES($1,$2,$3,$4,$5)',[req.body.name,slug,req.body.icon||'grid',parseInt(req.body.sort_order||'0',10),!!req.body.active]);
    res.redirect('/admin/categorias');
  } catch(err){next(err)}
});
router.post('/categorias/:id/editar', async (req,res,next)=>{
  try {
    const slug=slugify(req.body.slug||req.body.name,{lower:true,strict:true});
    await query('UPDATE categories SET name=$1,slug=$2,icon=$3,sort_order=$4,active=$5 WHERE id=$6',[req.body.name,slug,req.body.icon||'grid',parseInt(req.body.sort_order||'0',10),!!req.body.active,req.params.id]);
    res.redirect('/admin/categorias');
  } catch(err){next(err)}
});
router.post('/categorias/:id/excluir', async (req,res,next)=>{ try{await query('DELETE FROM categories WHERE id=$1',[req.params.id]);res.redirect('/admin/categorias')}catch(err){next(err)} });

router.get('/configuracoes', async (req,res,next)=>{
  try { res.render('admin/settings',{title:'Configurações',settings:await getSettings(),saved:req.query.saved==='1'}); } catch(err){next(err)}
});
router.post('/configuracoes', async (req,res,next)=>{
  try {
    const allowed=['site_name','whatsapp_number','hero_kicker','hero_title','hero_text','about_text','instagram_url','facebook_url','tiktok_url','footer_note'];
    for(const key of allowed){ if(req.body[key]!==undefined) await query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,String(req.body[key])]); }
    res.redirect('/admin/configuracoes?saved=1');
  } catch(err){next(err)}
});

router.get('/banners', async (req,res,next)=>{
  try { const b=await query('SELECT * FROM banners ORDER BY sort_order,id'); res.render('admin/banners',{title:'Banners',banners:b.rows}); } catch(err){next(err)}
});
router.post('/banners', upload.single('image'), async (req,res,next)=>{
  try {
    await query('INSERT INTO banners(title,subtitle,button_text,button_link,image_path,position,sort_order,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[
      req.body.title,req.body.subtitle||'',req.body.button_text||'',req.body.button_link||'',req.file?`/uploads/${req.file.filename}`:null,'home',parseInt(req.body.sort_order||'0',10),!!req.body.active
    ]);
    res.redirect('/admin/banners');
  } catch(err){next(err)}
});
router.post('/banners/:id/excluir', async (req,res,next)=>{try{await query('DELETE FROM banners WHERE id=$1',[req.params.id]);res.redirect('/admin/banners')}catch(err){next(err)}});

module.exports = router;
