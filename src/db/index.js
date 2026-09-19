const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const isProd = process.env.NODE_ENV === 'production';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('DATABASE_URL não configurada. O app precisa de PostgreSQL para iniciar.');
}

const pool = new Pool({
  connectionString,
  ssl: isProd && connectionString && !connectionString.includes('localhost') ? { rejectUnauthorized: false } : false,
});

async function query(text, params) {
  return pool.query(text, params);
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Administrador',
      role TEXT NOT NULL DEFAULT 'operator',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );



    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'operator';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS quotes (
      id SERIAL PRIMARY KEY,
      client_name TEXT,
      client_contact TEXT,
      shape TEXT NOT NULL DEFAULT 'rectangle',
      width_cm NUMERIC(10,2) NOT NULL,
      height_cm NUMERIC(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      with_cut BOOLEAN NOT NULL DEFAULT TRUE,
      capacity_per_sheet INTEGER NOT NULL,
      sheets INTEGER NOT NULL,
      total NUMERIC(12,2) NOT NULL,
      unit_price NUMERIC(12,4) NOT NULL,
      calculation_method TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      icon TEXT DEFAULT 'grid',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      short_description TEXT,
      description TEXT,
      price_from NUMERIC(12,2),
      image_path TEXT,
      gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
      specifications JSONB NOT NULL DEFAULT '[]'::jsonb,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    ALTER TABLE products ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '[]'::jsonb;

    CREATE TABLE IF NOT EXISTS banners (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT,
      button_text TEXT,
      button_link TEXT,
      image_path TEXT,
      position TEXT NOT NULL DEFAULT 'home',
      sort_order INTEGER NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    const exists = await query('SELECT id FROM users WHERE email = $1', [adminEmail.toLowerCase()]);
    if (!exists.rowCount) {
      const hash = await bcrypt.hash(adminPassword, 12);
      await query('INSERT INTO users(email,password_hash,name,role,active) VALUES($1,$2,$3,$4,TRUE)', [adminEmail.toLowerCase(), hash, 'Administrador', 'admin']);
      console.log('Administrador inicial criado a partir das variáveis de ambiente.');
    }
  }

  if (adminEmail) {
    await query("UPDATE users SET role='admin', active=TRUE WHERE email=$1", [adminEmail.toLowerCase()]);
  }
  // O primeiro usuário é o proprietário original do painel. Nunca rebaixá-lo para operador.
  await query("UPDATE users SET role='admin', active=TRUE WHERE id=(SELECT id FROM users ORDER BY created_at,id LIMIT 1)");
  const adminCount = await query("SELECT COUNT(*)::int AS count FROM users WHERE role='admin'");
  if (adminCount.rows[0].count === 0) {
    await query("UPDATE users SET role='admin', active=TRUE WHERE id=(SELECT id FROM users ORDER BY created_at,id LIMIT 1)");
  }

  const catCount = await query('SELECT COUNT(*)::int AS count FROM categories');
  if (catCount.rows[0].count === 0) {
    const categories = [
      ['Adesivos Personalizados','adesivos-personalizados','sticker',1],
      ['Agendas e Cadernos','agendas-e-cadernos','book',2],
      ['Brindes Corporativos','brindes-corporativos','gift',3],
      ['Decoração Personalizada','decoracao-personalizada','home',4],
      ['Papelaria Criativa','papelaria-criativa','file',5],
      ['Festas e Eventos','festas-e-eventos','party',6],
      ['Lacres e Etiquetas','lacres-e-etiquetas','tag',7]
    ];
    for (const c of categories) {
      await query('INSERT INTO categories(name,slug,icon,sort_order) VALUES($1,$2,$3,$4)', c);
    }
  }

  const prodCount = await query('SELECT COUNT(*)::int AS count FROM products');
  if (prodCount.rows[0].count === 0) {
    const cats = await query('SELECT id, slug FROM categories');
    const map = Object.fromEntries(cats.rows.map(c => [c.slug, c.id]));
    const products = [
      ['Adesivos Personalizados','adesivos-personalizados',map['adesivos-personalizados'],'Adesivos sob medida para embalagens, marcas, festas e projetos.',19.90,true],
      ['Cadernos e Agendas','cadernos-e-agendas',map['agendas-e-cadernos'],'Capas, miolos e acabamentos personalizados para sua ideia.',39.90,true],
      ['Canecas Personalizadas','canecas-personalizadas',map['brindes-corporativos'],'Canecas para presentes, equipes, eventos e marcas.',34.90,true],
      ['Lacres e Etiquetas','lacres-e-etiquetas',map['lacres-e-etiquetas'],'Etiquetas, lacres e identificação para valorizar sua embalagem.',14.90,true],
      ['Topos de Bolo','topos-de-bolo',map['festas-e-eventos'],'Topos personalizados para aniversários e comemorações.',24.90,true],
      ['Kits Corporativos','kits-corporativos',map['brindes-corporativos'],'Monte kits personalizados para clientes, equipes e eventos.',null,true]
    ];
    for (const p of products) {
      await query(`INSERT INTO products(name,slug,category_id,short_description,description,price_from,featured,active)
                   VALUES($1,$2,$3,$4,$4,$5,$6,TRUE)`, p);
    }
  }

  const defaults = {
    site_name: 'ImpriMarte Personalizados',
    whatsapp_number: process.env.WHATSAPP_NUMBER || '5545999999999',
    hero_kicker: 'IDEIAS QUE GANHAM VIDA',
    hero_title: 'Personalizados do seu jeito!',
    hero_text: 'Qualidade, criatividade e infinitas possibilidades para transformar ideias em momentos especiais.',
    about_text: 'A ImpriMarte transforma ideias em produtos personalizados para pessoas, marcas e momentos especiais.',
    instagram_url: '#',
    facebook_url: '#',
    tiktok_url: '#',
    footer_note: 'Feito com carinho para transformar suas ideias em algo único.',
    site_logo_path: '',
    favicon_path: '',
    hero_background_path: '',
    promo_background_path: '',
    quote_sheet_width_cm: '29.7',
    quote_sheet_height_cm: '42',
    quote_max_print_width_cm: '48',
    quote_spacing_cm: '0',
    quote_cut_sheet_price: '40',
    quote_no_cut_sheet_price: '36',
    quote_cut_three_sheet_price: '140',
    quote_no_cut_three_sheet_price: '120',
    quote_cut_linear_meter_price: '120',
    quote_no_cut_linear_meter_price: '108',
    quote_minimum_cut_price: '40',
    quote_minimum_no_cut_price: '36'
  };
  for (const [key, value] of Object.entries(defaults)) {
    await query('INSERT INTO settings(key,value) VALUES($1,$2) ON CONFLICT (key) DO NOTHING', [key, value]);
  }
}

async function getSettings() {
  const result = await query('SELECT key, value FROM settings');
  return Object.fromEntries(result.rows.map(r => [r.key, r.value]));
}

module.exports = { pool, query, initDb, getSettings };
