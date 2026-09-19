const express = require('express');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const { query, getSettings } = require('../db');
const { requireAdmin } = require('../middleware/auth');
const { upload } = require('../services/uploads');
const router = express.Router();

const bool = value => ['on', 'true', '1', 'yes'].includes(String(value || '').toLowerCase());
const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? parseInt(value, 10) : fallback;
const price = value => { const raw=String(value ?? '').trim(); if(!raw) return null; const n=Number(raw.replace(',', '.')); return Number.isFinite(n) ? n : null; };

async function uniqueSlug(table, name, excludeId = null, categoryId = null) {
  const allowed = new Set(['products', 'categories', 'subcategories']);
  if (!allowed.has(table)) throw new Error('Tabela inválida para slug');
  const base = slugify(String(name || '').trim() || 'item', { lower: true, strict: true }) || 'item';
  let candidate = base;
  let n = 2;
  while (true) {
    const params = [candidate];
    let sql = `SELECT id FROM ${table} WHERE slug=$1`;
    if (table === 'subcategories') { params.push(categoryId); sql += ` AND category_id=$${params.length}`; }
    if (excludeId) { params.push(excludeId); sql += ` AND id<>$${params.length}`; }
    if (!(await query(sql, params)).rowCount) return candidate;
    candidate = `${base}-${n++}`;
  }
}


async function validSubcategory(categoryId, subcategoryId) {
  if (!categoryId || !subcategoryId) return null;
  const found = await query('SELECT id FROM subcategories WHERE id=$1 AND category_id=$2', [subcategoryId, categoryId]);
  return found.rowCount ? found.rows[0].id : null;
}

async function renderLogin(req, res, status = 200, error = null) {
  const settings = await getSettings().catch(() => ({}));
  return res.status(status).render('admin/login', { title: 'Entrar no painel', error, settings, layout: false });
}

router.get('/login', async (req, res) => {
  if (req.session.userId) return res.redirect('/admin');
  return renderLogin(req, res);
});

router.post('/login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const result = await query('SELECT * FROM users WHERE email=$1', [email]);
    if (!result.rowCount || !(await bcrypt.compare(req.body.password || '', result.rows[0].password_hash))) {
      return renderLogin(req, res, 401, 'E-mail ou senha inválidos.');
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
router.use(async (req, res, next) => {
  try {
    res.locals.adminName = req.session.userName || 'Administrador';
    res.locals.adminPath = req.path;
    res.locals.adminSettings = await getSettings();
    res.locals.notice = req.query.ok || '';
    res.locals.adminIconMap = {
      sticker: 'bi-sticky', book: 'bi-journal-bookmark', gift: 'bi-gift', home: 'bi-house-heart',
      file: 'bi-palette', party: 'bi-balloon', tag: 'bi-tag', grid: 'bi-grid', box: 'bi-box-seam',
      mug: 'bi-cup-hot', star: 'bi-star', heart: 'bi-heart', briefcase: 'bi-briefcase'
    };
    next();
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const [productStats, categories, banners, recent] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE active=TRUE)::int AS active,
                    COUNT(*) FILTER (WHERE active=FALSE)::int AS inactive,
                    COUNT(*) FILTER (WHERE featured=TRUE AND active=TRUE)::int AS featured
             FROM products`),
      query('SELECT COUNT(*)::int AS count FROM categories WHERE active=TRUE'),
      query('SELECT COUNT(*)::int AS count FROM banners WHERE active=TRUE'),
      query(`SELECT p.id,p.name,p.slug,p.image_path,p.price_from,p.active,p.featured,c.name AS category_name
             FROM products p LEFT JOIN categories c ON c.id=p.category_id
             ORDER BY p.updated_at DESC NULLS LAST,p.created_at DESC LIMIT 6`)
    ]);
    const p = productStats.rows[0];
    res.render('admin/dashboard', {
      title: 'Visão geral',
      stats: { products: p.total, active: p.active, inactive: p.inactive, featured: p.featured, categories: categories.rows[0].count, banners: banners.rows[0].count },
      recent: recent.rows
    });
  } catch (err) { next(err); }
});

router.get('/produtos', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const status = (req.query.status || '').trim();
    const category = (req.query.category || '').trim();
    const params = [];
    const where = [];
    if (q) {
      params.push(`%${q}%`);
      where.push(`(p.name ILIKE $${params.length} OR p.slug ILIKE $${params.length} OR p.short_description ILIKE $${params.length})`);
    }
    if (status === 'active') where.push('p.active=TRUE');
    if (status === 'inactive') where.push('p.active=FALSE');
    if (status === 'featured') where.push('p.featured=TRUE');
    if (category) { params.push(category); where.push(`p.category_id=$${params.length}`); }
    const sqlWhere = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [result, cats, counts] = await Promise.all([
      query(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id ${sqlWhere} ORDER BY p.sort_order,p.name`, params),
      query('SELECT id,name FROM categories ORDER BY sort_order,name'),
      query(`SELECT COUNT(*)::int total, COUNT(*) FILTER(WHERE active=TRUE)::int active, COUNT(*) FILTER(WHERE active=FALSE)::int inactive, COUNT(*) FILTER(WHERE featured=TRUE)::int featured FROM products`)
    ]);
    res.render('admin/products', { title: 'Produtos', products: result.rows, categories: cats.rows, filters: { q, status, category }, counts: counts.rows[0] });
  } catch (err) { next(err); }
});

router.get('/produtos/novo', async (req, res, next) => {
  try {
    const [cats, subcats] = await Promise.all([query('SELECT * FROM categories ORDER BY sort_order,name'), query('SELECT * FROM subcategories WHERE active=TRUE ORDER BY category_id,sort_order,name')]);
    res.render('admin/product-form', { title: 'Novo produto', product: null, categories: cats.rows, subcategories: subcats.rows, error: null });
  } catch (err) { next(err); }
});

router.post('/produtos/novo', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 8 }]), async (req, res, next) => {
  try {
    const slug = await uniqueSlug('products', req.body.name);
    const categoryId = req.body.category_id || null;
    const subcategoryId = await validSubcategory(categoryId, req.body.subcategory_id);
    await query(`INSERT INTO products(category_id,subcategory_id,name,slug,short_description,description,price_from,image_path,gallery,featured,active,sort_order)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [
      categoryId, subcategoryId, req.body.name.trim(), slug, req.body.short_description || '', req.body.description || '', price(req.body.price_from),
      req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : null,
      JSON.stringify((req.files?.gallery || []).map(file => `/uploads/${file.filename}`)),
      bool(req.body.featured), bool(req.body.active), integer(req.body.sort_order)
    ]);
    res.redirect('/admin/produtos?ok=Produto criado com sucesso');
  } catch (err) { next(err); }
});

router.get('/produtos/:id/editar', async (req, res, next) => {
  try {
    const [p, cats, subcats] = await Promise.all([query('SELECT * FROM products WHERE id=$1',[req.params.id]), query('SELECT * FROM categories ORDER BY sort_order,name'), query('SELECT * FROM subcategories WHERE active=TRUE ORDER BY category_id,sort_order,name')]);
    if (!p.rowCount) return res.redirect('/admin/produtos');
    res.render('admin/product-form', { title: 'Editar produto', product: p.rows[0], categories: cats.rows, subcategories: subcats.rows, error: null });
  } catch (err) { next(err); }
});

router.post('/produtos/:id/editar', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'gallery', maxCount: 8 }]), async (req, res, next) => {
  try {
    const current = await query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!current.rowCount) return res.redirect('/admin/produtos');
    const slug = await uniqueSlug('products', req.body.name, req.params.id);
    const imagePath = req.files?.image?.[0] ? `/uploads/${req.files.image[0].filename}` : (bool(req.body.remove_image) ? null : current.rows[0].image_path);
    const currentGallery = Array.isArray(current.rows[0].gallery) ? current.rows[0].gallery : [];
    const removeGallery = Array.isArray(req.body.remove_gallery) ? req.body.remove_gallery : (req.body.remove_gallery ? [req.body.remove_gallery] : []);
    const keptGallery = currentGallery.filter(item => !removeGallery.includes(item));
    const newGallery = (req.files?.gallery || []).map(file => `/uploads/${file.filename}`);
    const gallery = [...keptGallery, ...newGallery].slice(0, 8);
    const categoryId = req.body.category_id || null;
    const subcategoryId = await validSubcategory(categoryId, req.body.subcategory_id);
    await query(`UPDATE products SET category_id=$1,subcategory_id=$2,name=$3,slug=$4,short_description=$5,description=$6,price_from=$7,image_path=$8,gallery=$9,
      featured=$10,active=$11,sort_order=$12,updated_at=NOW() WHERE id=$13`, [
      categoryId, subcategoryId, req.body.name.trim(), slug, req.body.short_description || '', req.body.description || '', price(req.body.price_from),
      imagePath, JSON.stringify(gallery), bool(req.body.featured), bool(req.body.active), integer(req.body.sort_order), req.params.id
    ]);
    res.redirect(`/admin/produtos/${req.params.id}/editar?ok=Produto atualizado`);
  } catch (err) { next(err); }
});

router.post('/produtos/:id/duplicar', async (req, res, next) => {
  try {
    const current = await query('SELECT * FROM products WHERE id=$1', [req.params.id]);
    if (!current.rowCount) return res.redirect('/admin/produtos');
    const p = current.rows[0];
    let base = slugify(`${p.slug}-copia`, { lower: true, strict: true });
    let slug = base;
    let n = 2;
    while ((await query('SELECT 1 FROM products WHERE slug=$1',[slug])).rowCount) slug = `${base}-${n++}`;
    const inserted = await query(`INSERT INTO products(category_id,subcategory_id,name,slug,short_description,description,price_from,image_path,gallery,featured,active,sort_order)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, [
      p.category_id, p.subcategory_id, `${p.name} (cópia)`, slug, p.short_description, p.description, p.price_from, p.image_path, JSON.stringify(p.gallery || []), false, false, p.sort_order
    ]);
    res.redirect(`/admin/produtos/${inserted.rows[0].id}/editar?ok=Produto duplicado. Revise e publique quando estiver pronto.`);
  } catch (err) { next(err); }
});

router.post('/produtos/:id/status', async (req, res, next) => {
  try {
    await query('UPDATE products SET active=NOT active,updated_at=NOW() WHERE id=$1',[req.params.id]);
    res.redirect('/admin/produtos?ok=Status do produto atualizado');
  } catch (err) { next(err); }
});

router.post('/produtos/:id/destaque', async (req, res, next) => {
  try {
    await query('UPDATE products SET featured=NOT featured,updated_at=NOW() WHERE id=$1',[req.params.id]);
    res.redirect('/admin/produtos?ok=Destaque atualizado');
  } catch (err) { next(err); }
});

router.post('/produtos/:id/excluir', async (req, res, next) => {
  try {
    await query('DELETE FROM products WHERE id=$1',[req.params.id]);
    res.redirect('/admin/produtos?ok=Produto excluído');
  } catch (err) { next(err); }
});

router.get('/categorias', async (req, res, next) => {
  try {
    const r = await query(`SELECT c.*,COUNT(DISTINCT p.id)::int AS product_count,COUNT(DISTINCT s.id)::int AS subcategory_count
      FROM categories c
      LEFT JOIN products p ON p.category_id=c.id
      LEFT JOIN subcategories s ON s.category_id=c.id
      GROUP BY c.id ORDER BY c.sort_order,c.name`);
    res.render('admin/categories',{title:'Categorias',categories:r.rows});
  } catch(err){next(err)}
});

router.post('/categorias', async (req,res,next)=>{
  try {
    const slug = await uniqueSlug('categories', req.body.name);
    await query('INSERT INTO categories(name,slug,icon,sort_order,active) VALUES($1,$2,$3,$4,$5)',[req.body.name.trim(),slug,req.body.icon||'grid',integer(req.body.sort_order),bool(req.body.active)]);
    res.redirect('/admin/categorias?ok=Categoria adicionada');
  } catch(err){next(err)}
});

router.get('/categorias/:id', async (req,res,next)=>{
  try {
    const [category, subcategories] = await Promise.all([
      query(`SELECT c.*,COUNT(DISTINCT p.id)::int AS product_count FROM categories c LEFT JOIN products p ON p.category_id=c.id WHERE c.id=$1 GROUP BY c.id`,[req.params.id]),
      query(`SELECT s.*,COUNT(p.id)::int AS product_count FROM subcategories s LEFT JOIN products p ON p.subcategory_id=s.id WHERE s.category_id=$1 GROUP BY s.id ORDER BY s.sort_order,s.name`,[req.params.id])
    ]);
    if (!category.rowCount) return res.redirect('/admin/categorias');
    res.render('admin/category-detail',{title:`Categoria: ${category.rows[0].name}`,category:category.rows[0],subcategories:subcategories.rows});
  } catch(err){next(err)}
});

router.post('/categorias/:id/editar', async (req,res,next)=>{
  try {
    const slug = await uniqueSlug('categories', req.body.name, req.params.id);
    await query('UPDATE categories SET name=$1,slug=$2,icon=$3,sort_order=$4,active=$5 WHERE id=$6',[req.body.name.trim(),slug,req.body.icon||'grid',integer(req.body.sort_order),bool(req.body.active),req.params.id]);
    const back = req.body.return_to === 'detail' ? `/admin/categorias/${req.params.id}?ok=Categoria atualizada` : '/admin/categorias?ok=Categoria atualizada';
    res.redirect(back);
  } catch(err){next(err)}
});

router.post('/categorias/:id/subcategorias', async (req,res,next)=>{
  try {
    const category = await query('SELECT id FROM categories WHERE id=$1',[req.params.id]);
    if (!category.rowCount) return res.redirect('/admin/categorias');
    const slug = await uniqueSlug('subcategories', req.body.name, null, req.params.id);
    await query('INSERT INTO subcategories(category_id,name,slug,sort_order,active) VALUES($1,$2,$3,$4,$5)',[req.params.id,req.body.name.trim(),slug,integer(req.body.sort_order),bool(req.body.active)]);
    res.redirect(`/admin/categorias/${req.params.id}?ok=Subcategoria adicionada`);
  } catch(err){next(err)}
});

router.post('/categorias/:categoryId/subcategorias/:id/editar', async (req,res,next)=>{
  try {
    const slug = await uniqueSlug('subcategories', req.body.name, req.params.id, req.params.categoryId);
    await query('UPDATE subcategories SET name=$1,slug=$2,sort_order=$3,active=$4 WHERE id=$5 AND category_id=$6',[req.body.name.trim(),slug,integer(req.body.sort_order),bool(req.body.active),req.params.id,req.params.categoryId]);
    res.redirect(`/admin/categorias/${req.params.categoryId}?ok=Subcategoria atualizada`);
  } catch(err){next(err)}
});

router.post('/categorias/:categoryId/subcategorias/:id/excluir', async (req,res,next)=>{
  try {
    await query('DELETE FROM subcategories WHERE id=$1 AND category_id=$2',[req.params.id,req.params.categoryId]);
    res.redirect(`/admin/categorias/${req.params.categoryId}?ok=Subcategoria excluída`);
  } catch(err){next(err)}
});

router.post('/categorias/:id/excluir', async (req,res,next)=>{
  try { await query('DELETE FROM categories WHERE id=$1',[req.params.id]); res.redirect('/admin/categorias?ok=Categoria excluída'); } catch(err){next(err)}
});

router.get('/configuracoes', async (req,res,next)=>{
  try { res.render('admin/settings',{title:'Configurações do site',settings:await getSettings(),saved:req.query.saved==='1'}); } catch(err){next(err)}
});

router.post('/configuracoes', upload.fields([
  { name: 'site_logo', maxCount: 1 }, { name: 'favicon', maxCount: 1 },
  { name: 'hero_background', maxCount: 1 }, { name: 'promo_background', maxCount: 1 }
]), async (req,res,next)=>{
  try {
    const allowed=['site_name','whatsapp_number','hero_kicker','hero_title','hero_text','about_text','instagram_url','facebook_url','tiktok_url','footer_note'];
    for(const key of allowed){
      if(req.body[key]!==undefined) await query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,String(req.body[key]).trim()]);
    }

    const current = await getSettings();
    const files = req.files || {};
    const assets = [
      ['site_logo_path','site_logo','remove_site_logo'],
      ['favicon_path','favicon','remove_favicon'],
      ['hero_background_path','hero_background','remove_hero_background'],
      ['promo_background_path','promo_background','remove_promo_background']
    ];
    for (const [key, field, removeField] of assets) {
      let value = current[key] || '';
      if (bool(req.body[removeField])) value = '';
      if (files[field]?.[0]) value = `/uploads/${files[field][0].filename}`;
      await query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,value]);
    }
    res.redirect('/admin/configuracoes?saved=1');
  } catch(err){next(err)}
});

router.get('/banners', async (req,res,next)=>{
  try { const b=await query('SELECT * FROM banners ORDER BY sort_order,id'); res.render('admin/banners',{title:'Banners',banners:b.rows,edit:null}); } catch(err){next(err)}
});

router.get('/banners/:id/editar', async (req,res,next)=>{
  try {
    const [banners, edit] = await Promise.all([query('SELECT * FROM banners ORDER BY sort_order,id'), query('SELECT * FROM banners WHERE id=$1',[req.params.id])]);
    if (!edit.rowCount) return res.redirect('/admin/banners');
    res.render('admin/banners',{title:'Banners',banners:banners.rows,edit:edit.rows[0]});
  } catch(err){next(err)}
});

router.post('/banners', upload.single('image'), async (req,res,next)=>{
  try {
    await query('INSERT INTO banners(title,subtitle,button_text,button_link,image_path,position,sort_order,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[
      req.body.title.trim(),req.body.subtitle||'',req.body.button_text||'',req.body.button_link||'',req.file?`/uploads/${req.file.filename}`:null,req.body.position||'home',integer(req.body.sort_order),bool(req.body.active)
    ]);
    res.redirect('/admin/banners?ok=Banner criado');
  } catch(err){next(err)}
});

router.post('/banners/:id/editar', upload.single('image'), async (req,res,next)=>{
  try {
    const current = await query('SELECT * FROM banners WHERE id=$1',[req.params.id]);
    if (!current.rowCount) return res.redirect('/admin/banners');
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (bool(req.body.remove_image) ? null : current.rows[0].image_path);
    await query(`UPDATE banners SET title=$1,subtitle=$2,button_text=$3,button_link=$4,image_path=$5,position=$6,sort_order=$7,active=$8 WHERE id=$9`,[
      req.body.title.trim(),req.body.subtitle||'',req.body.button_text||'',req.body.button_link||'',imagePath,req.body.position||'home',integer(req.body.sort_order),bool(req.body.active),req.params.id
    ]);
    res.redirect('/admin/banners?ok=Banner atualizado');
  } catch(err){next(err)}
});

router.post('/banners/:id/status', async (req,res,next)=>{
  try { await query('UPDATE banners SET active=NOT active WHERE id=$1',[req.params.id]); res.redirect('/admin/banners?ok=Status do banner atualizado'); } catch(err){next(err)}
});

router.post('/banners/:id/excluir', async (req,res,next)=>{
  try { await query('DELETE FROM banners WHERE id=$1',[req.params.id]); res.redirect('/admin/banners?ok=Banner excluído'); } catch(err){next(err)}
});

module.exports = router;
