const { Pool } = require('pg');

const databases = ['iqrab1', 'iqrab2', 'iqrab3', 'iqrab4', 'iqrab5', 'school_management10'];
const templateText = 'Ku: Mudane/Marwo {guardian_name}, Waxaan si xushmad leh kuugu xasuusinaynaa in lacagta bisha {month_name} ee ardayga {student_name} ay dhiman tahay ({amount_due} Birr). Fadlan bixi lacagta ka hor inta aysan bilaaban bisha cusub si waxbarashada ardaygu u sii socoto si habsarri leh. Mahadsanid, {school_name}.';

async function seedAll() {
  console.log('Seeding payment_reminder template across all databases...');
  for (const dbName of databases) {
    const pool = new Pool({
      host: '/var/run/postgresql',
      database: dbName,
      user: 'postgres'
    });

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.sms_templates (
          id SERIAL PRIMARY KEY,
          template_key VARCHAR(50) UNIQUE NOT NULL,
          template_text TEXT NOT NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.sms_logs (
          id SERIAL PRIMARY KEY,
          template_key VARCHAR(50),
          recipient_name VARCHAR(255),
          phone VARCHAR(50),
          message TEXT,
          status VARCHAR(50),
          provider VARCHAR(50),
          error TEXT,
          segments INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.payment_reminder_log (
          id SERIAL PRIMARY KEY,
          guardian_username VARCHAR(100),
          student_uuid VARCHAR(80),
          target_month INTEGER,
          target_year INTEGER,
          channel VARCHAR(20) DEFAULT 'sms',
          last_reminded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await pool.query(`
        ALTER TABLE public.payment_reminder_log ADD COLUMN IF NOT EXISTS target_month INTEGER;
        ALTER TABLE public.payment_reminder_log ADD COLUMN IF NOT EXISTS target_year INTEGER;
        ALTER TABLE public.payment_reminder_log ADD COLUMN IF NOT EXISTS channel VARCHAR(20) DEFAULT 'sms';
      `);

      await pool.query(`
        INSERT INTO public.sms_templates (template_key, template_text, is_active)
        VALUES ('payment_reminder', $1, true)
        ON CONFLICT (template_key) DO UPDATE
        SET template_text = EXCLUDED.template_text,
            is_active = true,
            updated_at = NOW();
      `, [templateText]);

      const res = await pool.query('SELECT template_key, length(template_text) as len FROM public.sms_templates WHERE template_key = $1', ['payment_reminder']);
      console.log(`✅ [${dbName}] payment_reminder seeded successfully: length = ${res.rows[0]?.len} characters`);
    } catch (e) {
      console.error(`❌ [${dbName}] Error:`, e.message);
    } finally {
      await pool.end();
    }
  }
}

seedAll();
