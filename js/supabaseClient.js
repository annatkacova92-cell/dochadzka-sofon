// ---------------------------------------------------------------------
// Sem vlož svoje Supabase údaje (Supabase dashboard -> Project Settings -> API).
// SUPABASE_ANON_KEY nie je tajný kľúč v klasickom zmysle — je bezpečné mať ho
// vo verejnom GitHub repozitári. Skutočné zabezpečenie dát rieši Row Level
// Security nastavené v sql/schema.sql (každý vidí len svoje záznamy, admin vidí všetko).
// ---------------------------------------------------------------------
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
