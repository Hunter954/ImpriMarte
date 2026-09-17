const express = require('express');
const { query, getSettings } = require('../db');
const router = express.Router();

router.use(async (req, res, next) => {
  try {
    res.locals.settings = await getSettings();
    const cats = await query('SELECT * FROM categories WHERE active=TRUE ORDER BY sort_order, name');
    res.locals.navCategories = cats.rows;
    res.locals.currentPath = req.path;
    next();
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const [cats, featured, banners] = await Promise.all([
      query('SELECT * FROM categories WHERE active=TRUE ORDER BY sort_order, name LIMIT 8'),
      query(`SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id
             WHERE p.active=TRUE AND p.featured=TRUE ORDER BY p.sort_order, p.created_at DESC LIMIT 8`),
      query(`SELECT * FROM banners WHERE active=TRUE AND position='home' ORDER BY sort_order, id`)
    ]);
    res.render('home', { title: 'ImpriMarte Personalizados', categories: cats.rows, products: featured.rows, banners: banners.rows });
  } catch (err) { next(err); }
});

router.get('/produtos', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const category = (req.query.categoria || '').trim();
    const params = [];
    const where = ['p.active=TRUE'];
    if (q) { params.push(`%${q}%`); where.push(`(p.name ILIKE $${params.length} OR p.short_description ILIKE $${params.length})`); }
    if (category) { params.push(category); where.push(`c.slug = $${params.length}`); }
    const result = await query(`SELECT p.*, c.name AS category_name, c.slug AS category_slug
      FROM products p LEFT JOIN categories c ON c.id=p.category_id
      WHERE ${where.join(' AND ')} ORDER BY p.sort_order, p.name`, params);
    res.render('catalog', { title: 'Produtos', products: result.rows, q, category });
  } catch (err) { next(err); }
});

router.get('/categoria/:slug', async (req, res, next) => {
  try {
    const cat = await query('SELECT * FROM categories WHERE slug=$1 AND active=TRUE', [req.params.slug]);
    if (!cat.rowCount) return res.status(404).render('404', { title: 'Categoria não encontrada' });
    const products = await query('SELECT * FROM products WHERE category_id=$1 AND active=TRUE ORDER BY sort_order,name', [cat.rows[0].id]);
    res.render('category', { title: cat.rows[0].name, category: cat.rows[0], products: products.rows });
  } catch (err) { next(err); }
});

router.get('/produto/:slug', async (req, res, next) => {
  try {
    const result = await query(`SELECT p.*, c.name AS category_name, c.slug AS category_slug FROM products p
      LEFT JOIN categories c ON c.id=p.category_id WHERE p.slug=$1 AND p.active=TRUE`, [req.params.slug]);
    if (!result.rowCount) return res.status(404).render('404', { title: 'Produto não encontrado' });
    const product = result.rows[0];
    const related = await query('SELECT * FROM products WHERE active=TRUE AND category_id=$1 AND id<>$2 ORDER BY featured DESC, sort_order LIMIT 4', [product.category_id, product.id]);
    res.render('product', { title: product.name, product, related: related.rows });
  } catch (err) { next(err); }
});

router.get('/carrinho', (req, res) => res.render('cart', { title: 'Carrinho' }));
router.get('/sobre', (req, res) => res.render('page', { title: 'Sobre a ImpriMarte', heading: 'Sobre a ImpriMarte', contentKey: 'about_text' }));
router.get('/contato', (req, res) => res.render('contact', { title: 'Contato' }));
router.get('/privacidade', (req, res) => res.render('static', { title: 'Política de Privacidade', heading: 'Política de Privacidade', body: 'Utilizamos apenas os dados necessários para responder solicitações, processar contatos e melhorar a experiência no site. Pedidos e orçamentos são concluídos diretamente pelo WhatsApp.' }));
router.get('/termos', (req, res) => res.render('static', { title: 'Termos de Uso', heading: 'Termos de Uso', body: 'Os valores exibidos podem representar preços iniciais e variam conforme quantidade, material, tamanho, acabamento e personalização. O orçamento final é confirmado pelo atendimento da ImpriMarte.' }));

module.exports = router;
